import fetch from 'node-fetch';
import CloudConvert from 'cloudconvert';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64, format } = req.body;

  // Call remove.bg API
  const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': process.env.REMOVE_BG_API_KEY },
    body: new URLSearchParams({
      image_file_b64: imageBase64,
      size: 'preview', // Use 'full' if you want HD (paid)
    }),
  });

  if (!removeBgResponse.ok) {
    return res.status(500).json({ error: 'Remove.bg API error' });
  }

  const pngBuffer = await removeBgResponse.buffer();

  if (format === 'png') {
    res.setHeader('Content-Type', 'image/png');
    return res.send(pngBuffer);
  }

  // Use CloudConvert to convert PNG -> requested format
  const cloudConvert = new CloudConvert(process.env.CLOUDCONVERT_API_KEY);

  // Create conversion job
  const job = await cloudConvert.jobs.create({
    tasks: {
      'import-my-file': { operation: 'import/upload' },
      'convert-my-file': {
        operation: 'convert',
        input: 'import-my-file',
        output_format: format,
      },
      'export-my-file': {
        operation: 'export/url',
        input: 'convert-my-file',
      },
    },
  });

  // Upload the PNG file to CloudConvert import task
  const uploadTask = job.tasks.find(t => t.name === 'import-my-file');
  await cloudConvert.tasks.upload(uploadTask, 'file.png', pngBuffer);

  // Wait for job completion
  const completedJob = await cloudConvert.jobs.wait(job.id);

  // Get URL of converted file
  const exportTask = completedJob.tasks.find(t => t.operation === 'export/url');
  const fileUrl = exportTask.result.files[0].url;

  // Fetch the converted file
  const convertedFileResponse = await fetch(fileUrl);
  const convertedFileBuffer = await convertedFileResponse.buffer();

  res.setHeader('Content-Type', `image/${format}`);
  res.send(convertedFileBuffer);
}
