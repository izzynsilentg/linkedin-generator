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
    
    // === HEADLINE - CENTERED AND MOVED DOWN ===
    ctx.fillStyle = '#273039';
    ctx.font = 'bold 38px Arial, sans-serif';
    ctx.textAlign = 'center'; // CHANGED to center
    
    const headlineY = 250; // MOVED DOWN from 220 to 250
    const centerX = templateWidth / 2; // Center point
    
    // Wrap and draw headline (centered)
    const headlineLines = wrapText(ctx, headline || '', templateWidth - 100);
    headlineLines.forEach((line, i) => {
      ctx.fillText(line, centerX, headlineY + (i * 50));
    });
    
    // === BODY TEXT - WITH PROPER PARAGRAPH SPACING ===
    ctx.font = '26px Arial, sans-serif';
    ctx.textAlign = 'left'; // Body text is left-aligned
    const bodyX = 50;
    let bodyY = headlineY + (headlineLines.length * 50) + 60; // Extra space after headline
    
    // Split body into paragraphs
    const paragraphs = (body || '').split('\n\n');
    
    paragraphs.forEach((paragraph, pIndex) => {
      if (paragraph.trim()) {
        const lines = wrapText(ctx, paragraph.trim(), templateWidth - 100);
        
        lines.forEach((line, i) => {
          // Check if we're running out of space (leave room for footer)
          if (bodyY < templateHeight - 180) {
            ctx.fillText(line, bodyX, bodyY);
            bodyY += 38; // Line spacing within paragraph
          }
        });
        
        // Add MORE spacing between paragraphs
        if (pIndex < paragraphs.length - 1) {
          bodyY += 35; // INCREASED from 20 to 35 for clear paragraph breaks
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

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Image generator running on port ${PORT}`);
});
