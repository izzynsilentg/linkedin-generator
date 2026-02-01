const express = require('express');
const bodyParser = require('body-parser');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());

// 1️⃣ Serve the /generated folder publicly
app.use('/generated', express.static(path.join(__dirname, 'generated')));

// Ensure generated folder exists
const generatedDir = path.join(__dirname, 'generated');
if (!fs.existsSync(generatedDir)) {
  fs.mkdirSync(generatedDir);
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/generate', async (req, res) => {
  try {
    const { headline, body } = req.body;

    if (!headline || !body) {
      return res.status(400).json({ error: "Missing headline or body" });
    }

    // Load template
    const templatePath = path.join(__dirname, 'template', 'template.png');

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `image-${timestamp}.png`;
    const outputPath = path.join(generatedDir, filename);

    // Build SVG overlay
    const svg = `
      <svg width="1200" height="1200">
        <style>
          .headline {
            fill: #000000;
            font-size: 38px;
            font-weight: 700;
            font-family: 'Arial';
          }
          .body {
            fill: #000000;
            font-size: 26px;
            font-family: 'Arial';
          }
        </style>

        <text x="60" y="220" class="headline">${headline}</text>

        <foreignObject x="60" y="300" width="1080" height="850">
          <div xmlns="http://www.w3.org/1999/xhtml"
               style="font-size: 26px; line-height: 38px; color: #000;">
            ${body.replace(/\n/g, '<br/>')}
          </div>
        </foreignObject>
      </svg>
    `;

    // Composite image
    await sharp(templatePath)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .png()
      .toFile(outputPath);

    // 2️⃣ Return public URL
    const publicUrl = `https://linkedin-generator-xljf.onrender.com/generated/${filename}`;

    res.json({
      status: "success",
      image_url: publicUrl
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log("Image generator running on port 3000");
});
