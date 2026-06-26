"""
03_inference_pipeline.py
==========================
Inference pipeline for ensemble NER models with MC Dropout uncertainty estimation
and Semantic Consistency checking.

Outputs enriched JSON with calibrated confidence and ensemble agreement.
"""

import os
import re
import json
import torch
import torch.nn as nn
from transformers import AutoTokenizer, AutoModel, AutoConfig
import numpy as np

MODEL_DIR = "model_ner_ensemble"
SEEDS = [42, 123, 456]

# --- CRF Re-implementation (needed for loading) ---

class CRFLayer(nn.Module):
    def __init__(self, num_tags):
        super().__init__()
        self.num_tags = num_tags
        self.transitions = nn.Parameter(torch.randn(num_tags, num_tags))
        self.start_transitions = nn.Parameter(torch.randn(num_tags))
        self.end_transitions = nn.Parameter(torch.randn(num_tags))
        
    def decode(self, emissions, mask=None):
        if mask is None:
            mask = torch.ones(emissions.shape[:2], dtype=torch.bool, device=emissions.device)
            
        seq_length = emissions.size(1)
        score = self.start_transitions + emissions[:, 0]
        history = []
        
        for i in range(1, seq_length):
            broadcast_score = score.unsqueeze(2)
            broadcast_emissions = emissions[:, i].unsqueeze(1)
            next_score = broadcast_score + self.transitions + broadcast_emissions
            
            max_score, max_indices = torch.max(next_score, dim=1)
            score = torch.where(mask[:, i].unsqueeze(1), max_score, score)
            history.append(max_indices)
            
        score += self.end_transitions
        _, best_last_tag = torch.max(score, dim=1)
        
        best_tags = [best_last_tag]
        for i, hist in enumerate(reversed(history)):
            is_valid = mask[:, seq_length - 1 - i]
            best_last_tag = torch.where(is_valid, hist[torch.arange(hist.size(0)), best_last_tag], best_last_tag)
            best_tags.append(best_last_tag)
            
        best_tags.reverse()
        return torch.stack(best_tags, dim=1)

class IndoBERTCRFForNER(nn.Module):
    def __init__(self, model_name_or_path, num_labels):
        super().__init__()
        config = AutoConfig.from_pretrained(model_name_or_path)
        self.bert = AutoModel.from_config(config)
        self.dropout = nn.Dropout(0.1)
        self.classifier = nn.Linear(config.hidden_size, num_labels)
        self.crf = CRFLayer(num_labels)
        
    def forward(self, input_ids, attention_mask):
        outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        sequence_output = outputs[0]
        sequence_output = self.dropout(sequence_output)
        emissions = self.classifier(sequence_output)
        return {"logits": emissions}

# --- GLOBAL STATE ---

_models = []
_tokenizers = []
_temperatures = []
_label_list = []
_id2label = {}

def _load_models():
    global _models, _tokenizers, _temperatures, _label_list, _id2label
    if _models:
        return
        
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    label_path = os.path.join(MODEL_DIR, "label_list.json")
    
    if not os.path.exists(label_path):
        print(f"Warning: {label_path} not found. Fallback to basic regex mode.")
        return
        
    with open(label_path, "r") as f:
        _label_list = json.load(f)
    _id2label = {i: l for i, l in enumerate(_label_list)}
    
    for seed in SEEDS:
        model_path = os.path.join(MODEL_DIR, f"model_{seed}")
        if not os.path.exists(model_path):
            continue
            
        tokenizer = AutoTokenizer.from_pretrained(model_path)
        model = IndoBERTCRFForNER(model_path, len(_label_list)).to(device)
        model.load_state_dict(torch.load(os.path.join(model_path, "pytorch_model.bin"), map_location=device))
        
        temp_path = os.path.join(model_path, "temperature.json")
        t = 1.0
        if os.path.exists(temp_path):
            with open(temp_path, "r") as f:
                t = json.load(f).get("temperature", 1.0)
                
        _models.append(model)
        _tokenizers.append(tokenizer)
        _temperatures.append(t)

# --- HELPERS ---

def parse_usia_ke_tahun(teks_usia):
    teks_usia = teks_usia.lower()
    m_bulan = re.search(r"(\d+)\s*bulan", teks_usia)
    if m_bulan:
        return round(int(m_bulan.group(1)) / 12, 2)
    m_tahun = re.search(r"(\d+)\s*(?:tahun|th|thn)", teks_usia)
    if m_tahun:
        return float(m_tahun.group(1))
    m_angka = re.search(r"(\d+)", teks_usia)
    if m_angka:
        return float(m_angka.group(1))
    return None

def parse_tanggungan(teks_tanggungan):
    parts = teks_tanggungan.split(maxsplit=1)
    hubungan = parts[0] if parts else None
    usia = parse_usia_ke_tahun(teks_tanggungan) if len(parts) > 1 else None
    return {"hubungan": hubungan, "usia": usia}

def check_consistency(profil):
    warnings = []
    
    usia = profil.get('usia_kk')
    if usia is not None and not (0 <= usia <= 120):
        warnings.append('usia_kk_out_of_range')
        
    anggota = profil.get('anggota_keluarga', [])
    if any(a.get('hubungan', '').lower() == 'cucu' for a in anggota):
        if usia is not None and usia < 30:
            warnings.append('too_young_for_grandchild')
            
    kondisi = profil.get('kondisi_medis_kritis', [])
    if any('hamil' in k.lower() for k in kondisi):
        nama = profil.get('nama_kk', '')
        if nama and nama.lower().startswith(('pak ', 'bapak ', 'bp ', 'bpk ')):
            warnings.append('pregnancy_gender_mismatch')
            
    lokasi = profil.get('asal_lokasi', '')
    if lokasi and len(lokasi) > 100:
        warnings.append('location_too_long')
        
    return warnings

def _enable_dropout(model):
    for m in model.modules():
        if m.__class__.__name__.startswith('Dropout'):
            m.train()

def _extract_entities(text, tags_seq, tokens, offset_mapping):
    entities = []
    current_entity = None
    
    for i, (tag, offset) in enumerate(zip(tags_seq, offset_mapping)):
        if offset[0] == offset[1]: # Special tokens
            continue
            
        if tag.startswith("B-"):
            if current_entity:
                entities.append(current_entity)
            current_entity = {
                "label": tag[2:],
                "start": offset[0],
                "end": offset[1],
                "word": text[offset[0]:offset[1]]
            }
        elif tag.startswith("I-") and current_entity and current_entity["label"] == tag[2:]:
            current_entity["end"] = offset[1]
            current_entity["word"] = text[current_entity["start"]:offset[1]]
        else:
            if current_entity:
                entities.append(current_entity)
                current_entity = None
                
    if current_entity:
        entities.append(current_entity)
        
    return entities

def _run_regex_fallback(text):
    profil = {
        'nama_kk': None, 'usia_kk': None, 'anggota_keluarga': [],
        'kondisi_medis_kritis': [], 'obat_tersedia': None,
        'mobilitas': 'mandiri', 'asal_lokasi': None,
        '_field_confidence': {}, '_consistency_warnings': [],
        '_needs_verification': [], '_ensemble_agreement': 0.0,
        '_entitas_mentah': []
    }
    
    # Simple regex fallback
    usia_match = re.search(r'(\d+)\s*(?:tahun|th)', text.lower())
    if usia_match:
        profil['usia_kk'] = float(usia_match.group(1))
        
    if 'diabetes' in text.lower() or 'gula' in text.lower():
        profil['kondisi_medis_kritis'].append('diabetes')
        
    profil['_consistency_warnings'].append('regex_fallback_used')
    return profil

def ekstrak_profil(teks_input):
    _load_models()
    
    if not _models:
        return _run_regex_fallback(teks_input)
        
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    all_preds = []
    all_probs = []
    all_mc_vars = []
    
    tokenizer = _tokenizers[0]
    encoded = tokenizer(teks_input, return_tensors="pt", return_offsets_mapping=True)
    input_ids = encoded["input_ids"].to(device)
    attention_mask = encoded["attention_mask"].to(device)
    offset_mapping = encoded["offset_mapping"][0].cpu().numpy()
    
    for model, t in zip(_models, _temperatures):
        # 1. Standard prediction with temperature scaling
        model.eval()
        with torch.no_grad():
            outputs = model(input_ids, attention_mask)
            logits = outputs["logits"]
            scaled_logits = logits / t
            probs = torch.softmax(scaled_logits, dim=-1)
            
            best_tags_idx = model.crf.decode(logits, mask=attention_mask.bool())[0].cpu().numpy()
            
            # Store for ensemble voting
            all_preds.append(best_tags_idx)
            
            # Get max prob for each token
            max_probs = probs[0].cpu().numpy().max(axis=-1)
            all_probs.append(max_probs)
            
        # 2. MC Dropout (N=5)
        _enable_dropout(model)
        mc_preds = []
        with torch.no_grad():
            for _ in range(5):
                out = model(input_ids, attention_mask)
                mc_probs = torch.softmax(out["logits"] / t, dim=-1)
                mc_preds.append(mc_probs[0].cpu().numpy())
                
        mc_preds = np.array(mc_preds) # [5, seq_len, num_labels]
        # Variance of the predicted class probabilities
        mc_var = np.var(mc_preds, axis=0).mean(axis=-1) # [seq_len]
        all_mc_vars.append(mc_var)
        
    # Ensemble majority vote per token
    all_preds = np.array(all_preds) # [3, seq_len]
    final_preds = []
    agreement_scores = []
    
    for i in range(all_preds.shape[1]):
        counts = np.bincount(all_preds[:, i])
        winner = np.argmax(counts)
        final_preds.append(winner)
        agreement_scores.append(counts[winner] / len(_models))
        
    tags_seq = [_id2label[p] for p in final_preds]
    
    # Average confidences and uncertainties across models
    avg_probs = np.mean(all_probs, axis=0)
    avg_mc_vars = np.mean(all_mc_vars, axis=0)
    
    entities = _extract_entities(teks_input, tags_seq, encoded.tokens(), offset_mapping)
    
    profil = {
        "nama_kk": None, "usia_kk": None, "anggota_keluarga": [],
        "kondisi_medis_kritis": [], "obat_tersedia": None,
        "mobilitas": "mandiri", "asal_lokasi": None,
        "_field_confidence": {}, "_consistency_warnings": [],
        "_needs_verification": [], "_ensemble_agreement": float(np.mean(agreement_scores)),
        "_entitas_mentah": []
    }
    
    # Calculate confidence per entity (mean over tokens in span)
    for ent in entities:
        start_tok = None
        end_tok = None
        for i, offset in enumerate(offset_mapping):
            if offset[0] == ent["start"]: start_tok = i
            if offset[1] == ent["end"]: end_tok = i
            
        if start_tok is not None and end_tok is not None:
            ent_prob = float(np.mean(avg_probs[start_tok:end_tok+1]))
            ent_var = float(np.mean(avg_mc_vars[start_tok:end_tok+1]))
            ent_agree = float(np.mean(agreement_scores[start_tok:end_tok+1]))
        else:
            ent_prob, ent_var, ent_agree = 0.5, 0.1, 0.5
            
        ent["score"] = ent_prob
        profil["_entitas_mentah"].append({
            "label": ent["label"], "teks": ent["word"],
            "confidence": round(ent_prob, 3), "uncertainty": round(ent_var, 3), "agreement": round(ent_agree, 3)
        })
        
        # Determine field mappings
        field_name = None
        label = ent["label"]
        text = ent["word"].strip()
        
        if label == "PER" and profil["nama_kk"] is None:
            profil["nama_kk"] = text
            field_name = "nama_kk"
        elif label == "USIA" and profil["usia_kk"] is None:
            profil["usia_kk"] = parse_usia_ke_tahun(text)
            field_name = "usia_kk"
        elif label == "KONDISI":
            profil["kondisi_medis_kritis"].append(text)
            field_name = "kondisi_medis_kritis"
        elif label == "TANGGUNGAN":
            profil["anggota_keluarga"].append(parse_tanggungan(text))
            field_name = "anggota_keluarga"
        elif label == "NEG_OBAT":
            profil["obat_tersedia"] = False
            field_name = "obat_tersedia"
        elif label == "MOBILITAS":
            profil["mobilitas"] = "bantuan" if any(w in text.lower() for w in ["kursi", "tongkat", "bantu", "tandu"]) else "tidak_bisa"
            field_name = "mobilitas"
        elif label == "LOKASI":
            profil["asal_lokasi"] = text
            field_name = "asal_lokasi"
            
        if field_name:
            # For lists, we might store the min confidence
            if field_name in ["kondisi_medis_kritis", "anggota_keluarga"]:
                if field_name not in profil["_field_confidence"]:
                    profil["_field_confidence"][field_name] = {"confidence": 1.0, "uncertainty": 0.0, "agreement": 1.0}
                profil["_field_confidence"][field_name]["confidence"] = min(profil["_field_confidence"][field_name]["confidence"], ent_prob)
                profil["_field_confidence"][field_name]["uncertainty"] = max(profil["_field_confidence"][field_name]["uncertainty"], ent_var)
                profil["_field_confidence"][field_name]["agreement"] = min(profil["_field_confidence"][field_name]["agreement"], ent_agree)
            else:
                profil["_field_confidence"][field_name] = {
                    "confidence": ent_prob, "uncertainty": ent_var, "agreement": ent_agree, "calibrated": True
                }
                
            # Disagreement routing logic
            if ent_agree < 0.67 or ent_var > 0.05 or ent_prob < 0.6:
                if field_name not in profil["_needs_verification"]:
                    profil["_needs_verification"].append(field_name)

    # 4. Semantic Consistency Checker
    warnings = check_consistency(profil)
    profil["_consistency_warnings"] = warnings
    
    # Penalize confidence for inconsistencies
    for w in warnings:
        if w == 'usia_kk_out_of_range' and 'usia_kk' in profil['_field_confidence']:
            profil['_field_confidence']['usia_kk']['confidence'] *= 0.5
            if 'usia_kk' not in profil['_needs_verification']: profil['_needs_verification'].append('usia_kk')
        elif w == 'too_young_for_grandchild' and 'usia_kk' in profil['_field_confidence']:
            profil['_field_confidence']['usia_kk']['confidence'] *= 0.6
            if 'usia_kk' not in profil['_needs_verification']: profil['_needs_verification'].append('usia_kk')
        elif w == 'pregnancy_gender_mismatch' and 'kondisi_medis_kritis' in profil['_field_confidence']:
            profil['_field_confidence']['kondisi_medis_kritis']['confidence'] *= 0.5
            if 'kondisi_medis_kritis' not in profil['_needs_verification']: profil['_needs_verification'].append('kondisi_medis_kritis')
            
    return profil

if __name__ == "__main__":
    contoh = [
        "Bu Siti, 67 tahun, diabetes, tinggal sendiri, bawa cucu 8 bulan, rumahnya habis kena longsor, tidak bawa obat sama sekali.",
        "Pak Ahmad 72 tahun, mantan pasien stroke, datang sama istri 68 tahun, bawa cucu 3 bulan. Rumah di Kampung Cikaret tenggelam. Tidak bawa obat pengencer darah."
    ]
    for teks in contoh:
        print("INPUT :", teks)
        hasil = ekstrak_profil(teks)
        print("OUTPUT:", json.dumps(hasil, indent=2))
        print()
