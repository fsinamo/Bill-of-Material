const url = process.env.NEXT_PUBLIC_APP_SCRIPT_URL;

async function syncData(transactions, categories) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "sync", transactions, categories })
  });
  return res.json();
}
