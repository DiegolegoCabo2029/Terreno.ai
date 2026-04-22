export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { direccion, alcaldia, precio, superficie,
          tipoPropiedad, usoSuelo, infoAdicional, tab } = req.body;

  if (!direccion && !alcaldia) {
    return res.status(400).json({ error: 'Se requiere dirección o alcaldía' });
  }

  const lines = [`Tipo de consulta: ${tab === 'compra' ? 'Compra de propiedad' : tab === 'construccion' ? 'Construcción/remodelación' : 'Revisión legal'}`];
  if (direccion) lines.push(`Ubicación: ${direccion}`);
  if (alcaldia) lines.push(`Alcaldía: ${alcaldia}`);
  if (tipoPropiedad) lines.push(`Tipo de propiedad: ${tipoPropiedad}`);
  if (precio) lines.push(`Precio pedido: $${precio} MXN`);
  if (superficie) lines.push(`Superficie: ${superficie} m²`);
  if (usoSuelo) lines.push(`Uso de suelo indicado: ${usoSuelo}`);
  if (infoAdicional) lines.push(`Información adicional: ${infoAdicional}`);
  const prompt = lines.join('\n');

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 4000,
        system: `Eres un experto en bienes raíces, trámites urbanos, uso de suelo y derecho inmobiliario en la Ciudad de México (CDMX). 
Cuando el usuario te dé datos de una propiedad, debes responder ÚNICAMENTE en JSON válido (sin backticks, sin texto extra).
El JSON debe tener exactamente esta estructura:
{
  "resumen": "string",
  "scoreLabel": "Seguro" | "Con precaución" | "Riesgo alto",
  "scoreClass": "safe" | "caution" | "risk",
  "valorEstimado": "string",
  "valorM2": "string",
  "nivelPrecio": "Bajo mercado" | "En línea con mercado" | "Sobre precio" | "No determinable",
  "nivelPrecioClass": "green" | "amber" | "red" | "blue",
  "costoEstimadoTramites": "string",
  "tiempoEstimado": "string",
  "permisos": [{ "tipo": "required"|"optional"|"warning", "icon": "string", "nombre": "string", "descripcion": "string", "institucion": "string", "costoAprox": "string", "tiempoAprox": "string" }],
  "legal": [{ "status": "ok"|"warn"|"bad", "texto": "string" }],
  "alertas": ["string"],
  "recomendaciones": ["string"]
}`,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) throw new Error(`Anthropic error: ${response.status}`);
    const data = await response.json();
    const raw = data.content.map(b => b.text || '').join('');
    const clean = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    return res.status(200).json(result);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al procesar el análisis' });
  }
}
