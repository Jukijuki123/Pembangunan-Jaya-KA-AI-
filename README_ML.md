# SIGAP AI — ML Pipeline (7 Layer Anti-Hallucination)

Sistem ekstraksi profil pengungsi SIGAP AI kini menggunakan arsitektur **7 Layer Defense Against Hallucination** yang merupakan standard state-of-the-art industri (seperti yang digunakan oleh Google/Meta).

Tujuannya adalah menjamin sistem memiliki akurasi ekstrim dan **near-zero hallucination**, yang beroperasi secara offline (tidak butuh API LLM cloud untuk kasus rutin). 

## 7 Layer Defense

1. **IndoBERT-Large + CRF Head**: Conditional Random Field head mencegah transisi sequence tag yang tidak valid.
2. **Curriculum Learning**: Training dataset diurutkan berdasarkan *difficulty* (mudah ke susah), dilengkapi *label smoothing* (ε=0.1) untuk mencegah overconfidence.
3. **Ensemble Voting**: Menggunakan *majority vote* dari 3 model (berbeda seed). Jika model tidak sepakat, memicu fallback.
4. **Semantic Consistency Checker**: Rule berbasis heuristik klinis/demografis (misal: usia KK harus > 30 jika punya cucu). Menurunkan confidence field jika terdeteksi inkonsistensi.
5. **Temperature-Scaled Calibration**: Probabilitas dari model diturunkan ke skala suhu ideal (dicari dari validation set) agar confidence score benar-benar akurat.
6. **MC Dropout Uncertainty**: Menjalankan model 5x saat inference dengan dropout aktif untuk mengestimasi epistemic uncertainty.
7. **Adversarial Data Augmentation**: Data latih (5000+ sampel) disuntik typo, sinonim daerah (Jawa, Sunda, dll), dan kata-kata noise agar model kebal terhadap variasi dunia nyata.

## Arsitektur Integrasi (PRANA)

Semua script ini terintegrasi ke dalam PRANA (Predictive Reliability Architecture for Natural Assessment):

```
01_generate_synthetic_data.py   -> Augmentasi Data & Curriculum (Layer 7 & 2)
02_train_ner_model.py           -> Training Ensemble & Calibration (Layer 1, 3, 5)
03_inference_pipeline.py        -> Inference, MC Dropout & Checker (Layer 3, 4, 6)
04_rule_engine_scoring_routing.py -> Skor Kerentanan tertimbang berdasarkan Uncertainty
```

### Cara Menjalankan Training (Disarankan di Google Colab)

```bash
# 1. Generate 5000+ data (di Colab/Lokal)
python 01_generate_synthetic_data.py --n_train 5000 --n_val 500 --n_test 300

# 2. Train Ensemble (WAJIB di GPU/Colab)
!pip install transformers datasets seqeval evaluate accelerate -q
!python 02_train_ner_model.py

# 3. Test Inference
python 03_inference_pipeline.py
```

### Fallback

Jika di lapangan tidak ada koneksi internet (sehingga gagal akses Gemini API) dan model NER gagal mencapai konsensus (Confidence Rendah), field akan ditandai *needs review* pada UI dan sistem skoring akan menurunkan prioritas skor (Confidence-weighted scoring) agar tidak terjadi "False MERAH".
