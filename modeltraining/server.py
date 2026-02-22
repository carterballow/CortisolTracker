import torch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

BASE_MODEL = "Qwen/Qwen3-0.6B"
ADAPTER_PATH = "./adapter"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, use_fast=True)

# IMPORTANT: CPU, no device_map, no offloading
base = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL,
    torch_dtype=torch.float32,
    device_map=None,
    low_cpu_mem_usage=False,
)
base.eval()

model = PeftModel.from_pretrained(base, ADAPTER_PATH)
model.eval()

class GenRequest(BaseModel):
    prompt: str
    max_new_tokens: int = 200
    temperature: float = 0.7
    top_p: float = 0.9

@app.post("/generate")
def generate(req: GenRequest):
    prompt = (req.prompt or "").strip()
    if not prompt:
        return {"text": "Please type a message first."}

    SYSTEM = (
        "You are CortisolTracker Assistant. "
        "Answer the user's question clearly and briefly. "
        "Do NOT mention being a therapist, a function, or disclaimers. "
        "Do NOT ask personal questions. "
    )

    full_prompt = SYSTEM + "\nUser: " + prompt + "\nAssistant:"

    inputs = tokenizer(full_prompt, return_tensors="pt")

    with torch.no_grad():
        out = model.generate(
            **inputs,
            max_new_tokens=req.max_new_tokens,
            do_sample=False,      # ✅ IMPORTANT: stop randomness
        )

    text = tokenizer.decode(out[0], skip_special_tokens=True)

    # Optional: only return the part after "Assistant:"
    if "Assistant:" in text:
        text = text.split("Assistant:", 1)[1].strip()

    return {"text": text}