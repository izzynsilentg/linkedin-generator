const express = require("express");
const sharp = require("sharp");
const { createCanvas } = require("canvas");
const app = express();

app.use(express.json());

// Helper function to wrap text
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (let word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

app.post("/generate", async (req, res) => {
  const { headline, body } = req.body;
  
  try {
    // Get template image dimensions first
    const templateMetadata = await sharp("./template/template.png").metadata();
    const templateWidth = templateMetadata.width;
    const templateHeight = templateMetadata.height;
    
    // Create canvas matching template dimensions
    const canvas = createCanvas(templateWidth, templateHeight);
    const ctx = canvas.getContext('2d');
    
    // Make canvas transparent
    ctx.clearRect(0, 0, templateWidth, templateHeight);
    
    // Set up headline
    ctx.fillStyle = '#273039';
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.textAlign = 'left';
    
    const headlineX = 50;
    const headlineY = 170;
    
    // Wrap and draw headline
    const headlineLines = wrapText(ctx, headline || '', templateWidth - 100);
    headlineLines.forEach((line, i) => {
      ctx.fillText(line, headlineX, headlineY + (i * 45));
    });
    
    // Set up body text
    ctx.font = '22px Arial, sans-serif';
    const bodyX = 50;
    let bodyY = headlineY + (headlineLines.length * 45) + 40;
    
    // Split body into paragraphs and wrap each
    const paragraphs = (body || '').split('\n\n');
    
    paragraphs.forEach((paragraph, pIndex) => {
      if (paragraph.trim()) {
        const lines = wrapText(ctx, paragraph.trim(), templateWidth - 100);
        
        lines.forEach((line, i) => {
          // Check if we're running out of space (leave room for footer)
          if (bodyY < templateHeight - 200) {
            ctx.fillText(line, bodyX, bodyY);
            bodyY += 32; // Line height
          }
        });
        
        // Add paragraph spacing
        if (pIndex < paragraphs.length - 1) {
          bodyY += 15;
        }
      }
    });
    
    // Convert canvas to buffer
    const textBuffer = canvas.toBuffer('image/png');
    
    // Composite text over template
    const image = await sharp("./template/template.png")
      .composite([
        {
          input: textBuffer,
          top: 0,
          left: 0,
          blend: 'over'
        }
      ])
      .png()
      .toBuffer();
    
    res.set("Content-Type", "image/png");
    res.send(image);
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Image generator running on port ${PORT}`);
});
