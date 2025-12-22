import { base44 } from "@/api/base44Client";

export async function fetchPipeStockPhoto(pipe) {
  try {
    const searchQuery = `${pipe.maker || ''} ${pipe.name || ''} ${pipe.shape || ''} tobacco pipe`.trim();
    
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Find a high-quality stock photo URL of this pipe: ${searchQuery}

Search the web for actual product photos or similar pipes from:
- Pipe retailer websites (smokingpipes.com, pipesandcigars.com, etc.)
- Manufacturer websites
- Estate pipe dealers
- Pipe collector sites

Look for a photo that matches:
- Maker: ${pipe.maker || 'any quality pipe maker'}
- Shape: ${pipe.shape || 'classic pipe shape'}
- Material: ${pipe.bowl_material || 'briar'}
- Finish: ${pipe.finish || 'smooth or sandblast'}

Return a direct image URL that is publicly accessible. Prefer high resolution images.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          image_url: { type: "string" },
          source_description: { type: "string" }
        }
      }
    });

    // Validate the URL exists and is accessible
    if (result.image_url && result.image_url.startsWith('http')) {
      return result.image_url;
    }
    return null;
  } catch (err) {
    console.error('Error fetching pipe photo:', err);
    return null;
  }
}

export async function fetchTobaccoStockPhoto(blend) {
  try {
    const searchQuery = `${blend.manufacturer || ''} ${blend.name || ''} pipe tobacco tin`.trim();
    
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Find a high-quality stock photo URL of this tobacco blend tin/logo: ${searchQuery}

Search the web for:
- Official product images from manufacturer websites
- Tobacco retailer product photos (smokingpipes.com, pipesandcigars.com, 4noggins.com)
- Tobacco tin images showing the label/logo
- Brand logos

Look for:
- Brand: ${blend.manufacturer || 'any tobacco manufacturer'}
- Blend: ${blend.name || 'tobacco blend'}
- Type: ${blend.blend_type || 'pipe tobacco'}

Return a direct image URL that is publicly accessible. Prefer official product photos or tin images.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          image_url: { type: "string" },
          source_description: { type: "string" }
        }
      }
    });

    return result.image_url || null;
  } catch (err) {
    console.error('Error fetching tobacco photo:', err);
    return null;
  }
}