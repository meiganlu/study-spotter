// Max texts sent in one embeddings request (the API allows up to 2,048)
const EMBED_BATCH_SIZE = 500;

// Gets embeddings for many texts at once instead of one request per text
export async function getEmbeddings(texts: string[]): Promise<Float32Array[]> {
  const embeddings: Float32Array[] = [];

  for (let start = 0; start < texts.length; start += EMBED_BATCH_SIZE) {
    const batch = texts.slice(start, start + EMBED_BATCH_SIZE);

    // API key is read server-side
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: batch,
      }),
    });

    if (!res.ok) {
      throw new Error(`Embeddings request failed: ${res.status} ${await res.text()}`);
    }

    const data: { data: { index: number; embedding: number[] }[] } = await res.json();

    // Sort by index so each embedding lines up with the text it came from
    // Stored as 32-bit floats to halve the memory each embedding takes
    data.data
      .sort((a, b) => a.index - b.index)
      .forEach(item => embeddings.push(Float32Array.from(item.embedding)));
  }

  return embeddings;
}
