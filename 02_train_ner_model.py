"""
02_train_ner_model.py
======================
Fine-tune IndoBERT-Large + CRF Head for NER in disaster refugee intake domain.

- Curriculum Learning (easy -> hard)
- Label Smoothing
- Ensemble Training (3 seeds)
- Temperature Scaling for post-hoc calibration

IMPORTANT: Run on Google Colab with T4 GPU.
!pip install transformers datasets seqeval evaluate accelerate
"""

import json
import os
import argparse
import random
import torch
import torch.nn as nn
import numpy as np
from torch.utils.data import DataLoader
from datasets import Dataset
from transformers import (
    AutoTokenizer,
    AutoModel,
    AutoConfig,
    get_cosine_schedule_with_warmup
)
import evaluate
from tqdm import tqdm

DATA_DIR = "data"
OUTPUT_DIR = "model_ner_ensemble"

def set_seed(seed):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

# --- 1. CRF IMPLEMENTATION ---

class CRFLayer(nn.Module):
    def __init__(self, num_tags):
        super().__init__()
        self.num_tags = num_tags
        self.transitions = nn.Parameter(torch.randn(num_tags, num_tags))
        self.start_transitions = nn.Parameter(torch.randn(num_tags))
        self.end_transitions = nn.Parameter(torch.randn(num_tags))
    
    def _compute_normalizer(self, emissions, mask):
        seq_length = emissions.size(1)
        score = self.start_transitions + emissions[:, 0]
        
        for i in range(1, seq_length):
            broadcast_score = score.unsqueeze(2)
            broadcast_emissions = emissions[:, i].unsqueeze(1)
            next_score = broadcast_score + self.transitions + broadcast_emissions
            next_score = torch.logsumexp(next_score, dim=1)
            score = torch.where(mask[:, i].unsqueeze(1), next_score, score)
            
        score += self.end_transitions
        return torch.logsumexp(score, dim=1)
        
    def _compute_score(self, emissions, tags, mask):
        seq_length = emissions.size(1)
        score = self.start_transitions[tags[:, 0]] + emissions[torch.arange(emissions.size(0)), 0, tags[:, 0]]
        
        for i in range(1, seq_length):
            is_valid = mask[:, i]
            previous_tags = tags[:, i - 1]
            current_tags = tags[:, i]
            
            emission_score = emissions[torch.arange(emissions.size(0)), i, current_tags]
            transition_score = self.transitions[previous_tags, current_tags]
            
            score += torch.where(is_valid, emission_score + transition_score, torch.tensor(0.).to(score.device))
            
        last_valid_indices = mask.sum(dim=1) - 1
        last_tags = tags[torch.arange(tags.size(0)), last_valid_indices]
        score += self.end_transitions[last_tags]
        return score
    
    def forward(self, emissions, tags, mask=None):
        if mask is None:
            mask = torch.ones(emissions.shape[:2], dtype=torch.bool, device=emissions.device)
        
        numerator = self._compute_score(emissions, tags, mask)
        denominator = self._compute_normalizer(emissions, mask)
        return torch.mean(denominator - numerator)

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
    def __init__(self, model_name, num_labels):
        super().__init__()
        self.bert = AutoModel.from_pretrained(model_name)
        self.dropout = nn.Dropout(0.1)
        self.classifier = nn.Linear(self.bert.config.hidden_size, num_labels)
        self.crf = CRFLayer(num_labels)
        
    def forward(self, input_ids, attention_mask, labels=None):
        outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        sequence_output = outputs[0]
        sequence_output = self.dropout(sequence_output)
        emissions = self.classifier(sequence_output)
        
        loss = None
        if labels is not None:
            # Mask out padding (-100)
            crf_mask = (labels != -100) & attention_mask.bool()
            # Replace -100 with 0 for CRF calculation (it will be masked out anyway)
            crf_labels = labels.clone()
            crf_labels[crf_labels == -100] = 0
            
            # Label Smoothing: apply to logits/emissions before CRF
            # Simplistic approach: add noise to emissions
            smoothed_emissions = emissions + torch.randn_like(emissions) * 0.1
            loss = self.crf(smoothed_emissions, crf_labels, mask=crf_mask)
            
        return {"loss": loss, "logits": emissions}

# --- 2. DATA PROCESSING ---

def load_jsonl(path):
    rows = []
    if not os.path.exists(path):
        return rows
    with open(path, encoding="utf-8") as f:
        for line in f:
            rows.append(json.loads(line))
    return rows

def build_label_list(splits):
    label_set = set()
    for split in splits:
        for ex in split:
            label_set.update(ex["tags"])
    labels = sorted(label_set - {"O"})
    return ["O"] + labels

def prepare_data(tokenizer, raw_data, label2id):
    def tokenize_and_align(examples):
        tokenized = tokenizer(
            examples["tokens"],
            truncation=True,
            is_split_into_words=True,
            max_length=256,
            padding="max_length"
        )
        all_labels = []
        for i, label_ids in enumerate(examples["tags"]):
            word_ids = tokenized.word_ids(batch_index=i)
            label_seq = []
            prev_word_id = None
            for wid in word_ids:
                if wid is None:
                    label_seq.append(-100)
                elif wid != prev_word_id:
                    label_seq.append(label2id[label_ids[wid]])
                else:
                    label_seq.append(-100)
                prev_word_id = wid
            all_labels.append(label_seq)
        tokenized["labels"] = all_labels
        return tokenized

    ds = Dataset.from_dict({
        "tokens": [ex["tokens"] for ex in raw_data],
        "tags": [ex["tags"] for ex in raw_data],
        "difficulty": [ex.get("difficulty", "easy") for ex in raw_data]
    })
    return ds.map(tokenize_and_align, batched=True).with_format("torch")

# --- 3. ECE CALIBRATION ---

def compute_ece(confidences, accuracies, n_bins=15):
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    for i in range(n_bins):
        in_bin = (confidences > bin_boundaries[i]) & (confidences <= bin_boundaries[i+1])
        prop_in_bin = np.mean(in_bin)
        if prop_in_bin > 0:
            acc_in_bin = np.mean(accuracies[in_bin])
            avg_conf_in_bin = np.mean(confidences[in_bin])
            ece += np.abs(avg_conf_in_bin - acc_in_bin) * prop_in_bin
    return ece

def find_optimal_temperature(model, val_loader, device):
    model.eval()
    all_logits = []
    all_labels = []
    all_masks = []
    
    with torch.no_grad():
        for batch in val_loader:
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            labels = batch["labels"].to(device)
            
            outputs = model(input_ids, attention_mask)
            all_logits.append(outputs["logits"].cpu())
            all_labels.append(labels.cpu())
            all_masks.append(attention_mask.cpu() & (labels.cpu() != -100))
            
    logits = torch.cat(all_logits, dim=0)
    labels = torch.cat(all_labels, dim=0)
    masks = torch.cat(all_masks, dim=0)
    
    valid_logits = logits[masks]
    valid_labels = labels[masks]
    
    temps = np.arange(0.5, 3.1, 0.1)
    best_t = 1.0
    best_ece = float('inf')
    
    for t in temps:
        scaled_logits = valid_logits / t
        probs = torch.softmax(scaled_logits, dim=-1)
        confs, preds = torch.max(probs, dim=-1)
        
        accs = (preds == valid_labels).float().numpy()
        confs = confs.numpy()
        
        ece = compute_ece(confs, accs)
        if ece < best_ece:
            best_ece = ece
            best_t = float(t)
            
    return best_t, best_ece

# --- 4. TRAINING LOOP ---

def train_model(seed, lr, model_name, train_raw, val_ds, label_list):
    set_seed(seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    label2id = {l: i for i, l in enumerate(label_list)}
    id2label = {i: l for i, l in enumerate(label_list)}
    
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    
    # Curriculum sorting
    diff_order = {"easy": 0, "medium": 1, "hard": 2}
    train_raw_sorted = sorted(train_raw, key=lambda x: diff_order.get(x.get("difficulty", "easy"), 0))
    train_ds_sorted = prepare_data(tokenizer, train_raw_sorted, label2id)
    train_ds_shuffled = prepare_data(tokenizer, train_raw, label2id).shuffle(seed=seed)
    
    train_loader_sorted = DataLoader(train_ds_sorted, batch_size=8)
    train_loader_shuffled = DataLoader(train_ds_shuffled, batch_size=8, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=16)
    
    model = IndoBERTCRFForNER(model_name, len(label_list)).to(device)
    
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=0.01)
    epochs = 10
    total_steps = len(train_loader_sorted) * epochs
    scheduler = get_cosine_schedule_with_warmup(optimizer, num_warmup_steps=int(0.1 * total_steps), num_training_steps=total_steps)
    
    seqeval = evaluate.load("seqeval")
    
    best_f1 = 0
    patience = 3
    patience_counter = 0
    
    output_model_dir = os.path.join(OUTPUT_DIR, f"model_{seed}")
    os.makedirs(output_model_dir, exist_ok=True)
    
    for epoch in range(epochs):
        model.train()
        # Curriculum: sorted for first 2 epochs, shuffled after
        loader = train_loader_sorted if epoch < 2 else train_loader_shuffled
        
        total_loss = 0
        optimizer.zero_grad()
        for i, batch in enumerate(tqdm(loader, desc=f"Epoch {epoch+1} (Seed {seed})")):
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            labels = batch["labels"].to(device)
            
            outputs = model(input_ids, attention_mask, labels=labels)
            loss = outputs["loss"]
            
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            
            if (i + 1) % 8 == 0 or (i + 1) == len(loader): # gradient accumulation
                optimizer.step()
                scheduler.step()
                optimizer.zero_grad()
                
            total_loss += loss.item()
            
        # Eval
        model.eval()
        all_preds = []
        all_labels = []
        with torch.no_grad():
            for batch in val_loader:
                input_ids = batch["input_ids"].to(device)
                attention_mask = batch["attention_mask"].to(device)
                labels = batch["labels"].to(device)
                
                outputs = model(input_ids, attention_mask)
                crf_mask = (labels != -100) & attention_mask.bool()
                best_tags = model.crf.decode(outputs["logits"], mask=crf_mask)
                
                for i in range(labels.size(0)):
                    mask = crf_mask[i]
                    pred = best_tags[i][mask].cpu().numpy().tolist()
                    true = labels[i][mask].cpu().numpy().tolist()
                    
                    all_preds.append([id2label[p] for p in pred])
                    all_labels.append([id2label[t] for t in true])
                    
        metrics = seqeval.compute(predictions=all_preds, references=all_labels)
        f1 = metrics["overall_f1"]
        print(f"Epoch {epoch+1} Loss: {total_loss/len(loader):.4f} | Val F1: {f1:.4f}")
        
        if f1 > best_f1:
            best_f1 = f1
            patience_counter = 0
            # Save model
            torch.save(model.state_dict(), os.path.join(output_model_dir, "pytorch_model.bin"))
            tokenizer.save_pretrained(output_model_dir)
            model.bert.config.save_pretrained(output_model_dir)
        else:
            patience_counter += 1
            if patience_counter >= patience:
                print("Early stopping triggered!")
                break
                
    # Load best model for calibration
    model.load_state_dict(torch.load(os.path.join(output_model_dir, "pytorch_model.bin")))
    best_t, best_ece = find_optimal_temperature(model, val_loader, device)
    print(f"Seed {seed} | Optimal T: {best_t} | ECE: {best_ece:.4f}")
    
    with open(os.path.join(output_model_dir, "temperature.json"), "w") as f:
        json.dump({"temperature": best_t, "ece": best_ece}, f)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--use_base", action="store_true", help="Use indobert-base instead of large")
    args = parser.parse_args()
    
    model_name = "indobenchmark/indobert-base-p1" if args.use_base else "indobenchmark/indobert-large-p1"
    
    train_raw = load_jsonl(os.path.join(DATA_DIR, "train.jsonl"))
    val_raw = load_jsonl(os.path.join(DATA_DIR, "val.jsonl"))
    test_raw = load_jsonl(os.path.join(DATA_DIR, "test.jsonl"))
    
    if not train_raw:
        print("Data not found. Run 01_generate_synthetic_data.py first.")
        return
        
    label_list = build_label_list([train_raw, val_raw, test_raw])
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(os.path.join(OUTPUT_DIR, "label_list.json"), "w") as f:
        json.dump(label_list, f)
        
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    val_ds = prepare_data(tokenizer, val_raw, {l: i for i, l in enumerate(label_list)})
    
    configs = [
        {"seed": 42, "lr": 2e-5},
        {"seed": 123, "lr": 2.5e-5},
        {"seed": 456, "lr": 1.5e-5}
    ]
    
    for cfg in configs:
        print(f"\n--- Training Seed {cfg['seed']} ---")
        train_model(cfg["seed"], cfg["lr"], model_name, train_raw, val_ds, label_list)

if __name__ == "__main__":
    main()
