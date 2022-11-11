async function postData(url = "", data = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return response.json();
}
export async function post(event, ...args) {
  return postData("http://localhost:51915/", {
    event,
    args,
  });
}
