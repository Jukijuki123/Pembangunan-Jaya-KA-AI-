"""
02_train_ner_model.py
======================
Fine-tune IndoBERT (indobenchmark/indobert-base-p1) untuk token classification
(NER) pada domain intake pengungsi PMI.

PENTING — JALANKAN DI GOOGLE COLAB, BUKAN DI LOKAL:
  1. Buka https://colab.research.google.com
  2. Runtime > Change runtime type > pilih GPU (T4 gratis cukup)
  3. Upload folder data/ (hasil dari 01_generate_synthetic_data.py) ke Colab
  4. Install dependency:
       !pip install transformers datasets seqeval evaluate accelerate -q
  5. Upload & jalankan script ini:
       !python 02_train_ner_model.py

Lama training: dataset 1500 contoh + IndoBERT-base di T4 GPU -> sekitar
5-10 menit untuk 5 epoch. Jangan coba di laptop tanpa GPU, akan sangat lambat.

OUTPUT: folder ./model_ner/ berisi model + tokenizer hasil fine-tuning,
siap dipakai oleh 03_inference_pipeline.py
"""

import json
import os

import numpy as np
from datasets import Dataset
from transformers import (
    AutoTokenizer,
    AutoModelForTokenClassification,
    DataCollatorForTokenClassification,
    TrainingArguments,
    Trainer,
)
import evaluate

MODEL_NAME = "indobenchmark/indobert-base-p1"
DATA_DIR = "data"
OUTPUT_DIR = "model_ner"


def load_jsonl(path):
    rows = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            rows.append(json.loads(line))
    return rows


def build_label_list(*splits):
    label_set = set()
    for split in splits:
        for ex in split:
            label_set.update(ex["tags"])
    # "O" harus index 0 secara konvensi, sisanya urut alfabet biar konsisten
    labels = sorted(label_set - {"O"})
    return ["O"] + labels


def main():
    train_raw = load_jsonl(os.path.join(DATA_DIR, "train.jsonl"))
    val_raw = load_jsonl(os.path.join(DATA_DIR, "val.jsonl"))
    test_raw = load_jsonl(os.path.join(DATA_DIR, "test.jsonl"))

    label_list = build_label_list(train_raw, val_raw, test_raw)
    label2id = {l: i for i, l in enumerate(label_list)}
    id2label = {i: l for i, l in enumerate(label_list)}
    print(f"Jumlah label: {len(label_list)} -> {label_list}")

    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

    def to_hf_dataset(raw):
        return Dataset.from_dict({
            "tokens": [ex["tokens"] for ex in raw],
            "tags": [[label2id[t] for t in ex["tags"]] for ex in raw],
        })

    train_ds = to_hf_dataset(train_raw)
    val_ds = to_hf_dataset(val_raw)
    test_ds = to_hf_dataset(test_raw)

    # -----------------------------------------------------------------
    # Alignment subword <-> label.
    # BERT memecah kata jadi subword (mis. "ginjal" -> "gin", "##jal").
    # Hanya token PERTAMA dari setiap kata diberi label asli, subword
    # lanjutannya diberi -100 (diabaikan saat hitung loss). Ini praktik
    # standar HuggingFace untuk token classification.
    # -----------------------------------------------------------------

    def tokenize_and_align(examples):
        tokenized = tokenizer(
            examples["tokens"],
            truncation=True,
            is_split_into_words=True,
            max_length=128,
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
                    label_seq.append(label_ids[wid])
                else:
                    label_seq.append(-100)
                prev_word_id = wid
            all_labels.append(label_seq)
        tokenized["labels"] = all_labels
        return tokenized

    train_tok = train_ds.map(tokenize_and_align, batched=True)
    val_tok = val_ds.map(tokenize_and_align, batched=True)
    test_tok = test_ds.map(tokenize_and_align, batched=True)

    model = AutoModelForTokenClassification.from_pretrained(
        MODEL_NAME, num_labels=len(label_list), id2label=id2label, label2id=label2id
    )

    seqeval = evaluate.load("seqeval")

    def compute_metrics(p):
        predictions, labels = p
        predictions = np.argmax(predictions, axis=2)

        true_predictions = [
            [id2label[p_] for (p_, l_) in zip(pred, lab) if l_ != -100]
            for pred, lab in zip(predictions, labels)
        ]
        true_labels = [
            [id2label[l_] for (p_, l_) in zip(pred, lab) if l_ != -100]
            for pred, lab in zip(predictions, labels)
        ]
        results = seqeval.compute(predictions=true_predictions, references=true_labels)
        return {
            "precision": results["overall_precision"],
            "recall": results["overall_recall"],
            "f1": results["overall_f1"],
            "accuracy": results["overall_accuracy"],
        }

    data_collator = DataCollatorForTokenClassification(tokenizer)

    args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        learning_rate=3e-5,
        per_device_train_batch_size=16,
        per_device_eval_batch_size=16,
        num_train_epochs=5,
        weight_decay=0.01,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1",
        logging_steps=20,
        report_to="none",
    )

    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=train_tok,
        eval_dataset=val_tok,
        tokenizer=tokenizer,
        data_collator=data_collator,
        compute_metrics=compute_metrics,
    )

    trainer.train()

    print("\n=== Evaluasi di test set (data yang belum pernah dilihat model) ===")
    test_metrics = trainer.evaluate(test_tok)
    print(test_metrics)

    trainer.save_model(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    with open(os.path.join(OUTPUT_DIR, "label_list.json"), "w") as f:
        json.dump(label_list, f)

    print(f"\nModel tersimpan di ./{OUTPUT_DIR}/ -- siap dipakai inference.")


if __name__ == "__main__":
    main()
