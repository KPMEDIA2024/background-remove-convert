const express = require('express');
const formidable = require('formidable');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.post('/convert', (req, res) => {
  const form = formidable({ multiples: false });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error('Error parsing form:', err);
      return res.status(500).send('Form parsing error');
    }

    const file = files.image;
    if (!file) {
      return res.status(400).send('No image uploaded');
    }

    const outputPath = path.join(__dirname, 'output.png');

    sharp(file.filepath)
      .png()
      .toFile(outputPath)
      .then(() => {
        res.sendFile(outputPath, () => {
          fs.unlinkSync(outputPath); // cleanup temp file
        });
      })
      .catch(error => {
        console.error('Sharp error:', error);
        res.status(500).send('Image processing error');
      });
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
