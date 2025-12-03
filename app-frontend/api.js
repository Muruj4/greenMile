// driver/api.js

// هنا نحط IP حق اللابتوب من ipconfig
const BASE_URL = "http://192.168.0.112:8000";

export async function getRoutes(params) {
  const query = new URLSearchParams({
    origin: params.origin,
    destination: params.destination,
    city: params.city,
    vehicleType: params.vehicleType,
    fuelType: params.fuelType,
    modelYear: String(params.modelYear),
  }).toString();

  const url = `${BASE_URL}/routes?${query}`;
  console.log("Calling backend:", url);

  const res = await fetch(url, { method: "GET" });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend error ${res.status}: ${text}`);
  }

  // هذا اللي رجعتيه في الرسالة: { routes: [...] }
  return await res.json();
}
