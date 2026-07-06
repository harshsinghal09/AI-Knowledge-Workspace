from app.providers.base_provider import LLMProvider

SYSTEM_PROMPT = """You are a document-grounded assistant. You must answer ONLY using \
the context excerpts provided below. Do not use outside knowledge, do not speculate, \
and do not fill gaps with assumptions.

If the answer cannot be found in the provided context, respond EXACTLY with:
"I couldn't find this information in your uploaded documents."

Keep answers concise and directly grounded in the excerpts."""


def build_prompt(question: str, chunks: list[dict]) -> str:
    context_blocks = []
    for i, chunk in enumerate(chunks, start=1):
        page_info = f", page {chunk['pageNumber']}" if chunk.get("pageNumber") else ""
        context_blocks.append(
            f"[Source {i}: {chunk['filename']}{page_info}]\n{chunk['chunkText']}"
        )

    context = "\n\n".join(context_blocks)
    return f"Context:\n{context}\n\nQuestion: {question}"


async def generate_answer(provider: LLMProvider, question: str, chunks: list[dict]) -> str:
    if not chunks:
        return "I couldn't find this information in your uploaded documents."

    user_prompt = build_prompt(question, chunks)
    return await provider.generate(SYSTEM_PROMPT, user_prompt)
