import fetch from 'node-fetch';
import CloudConvert from 'cloudconvert';
import 'dotenv/config';

const cloudConvert = new CloudConvert(process.env.CLOUDCONVERT_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64, outputFormat } = req.body;
    if (!imageBase64 || !outputFormat) {
      return res.status(400).json({ error: 'Missing image or format' });
    }

    const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.REMOVE_BG_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_file_b64: imageBase64,
        size: 'auto',
        format: 'png',
      }),
    });

    if (!removeBgResponse.ok) {
      const error = await removeBgResponse.text();
      return res.status(500).json({ error: 'remove.bg error: ' + error });
    }

    const removeBgBuffer = await removeBgResponse.buffer();

    if (outputFormat.toLowerCase() === 'png') {
      res.setHeader('Content-Type', 'image/png');
      return res.status(200).send(removeBgBuffer);
    }

    const job = await cloudConvert.jobs.create({
      tasks: {
        'import-my-file': {
          operation: 'import/upload',
        },
        'convert-my-file': {
          operation: 'convert',
          input: 'import-my-file',
          output_format: outputFormat.toLowerCase(),
        },
        'export-my-file': {
          operation: 'export/url',
          input: 'convert-my-file',
        },
      },
    });

    const uploadTask = job.tasks.find(task => task.name === 'import-my-file');

    await cloudConvert.tasks.upload(uploadTask, removeBgBuffer, 'image.png');

    const completedJob = await cloudConvert.jobs.wait(job.id);

    const exportTask = completedJob.tasks.find(task => task.operation === 'export/url');
    const fileUrl = exportTask.result.files[0].url;

    const convertedResponse = await fetch(fileUrl);
    if (!convertedResponse.ok) {
      return res.status(500).json({ error: 'CloudConvert fetch error' });
    }
    const convertedBuffer = await convertedResponse.buffer();

    res.setHeader('Content-Type', `image/${outputFormat.toLowerCase()}`);
    res.status(200).send(convertedBuffer);

  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

