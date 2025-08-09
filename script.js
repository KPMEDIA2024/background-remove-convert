document.getElementById('convertBtn').onclick = async () => {
  const fileInput = document.getElementById('fileInput');
  const formatSelect = document.getElementById('formatSelect');
  const status = document.getElementById('status');
  const downloadLink = document.getElementById('downloadLink');

  if (!fileInput.files.length) {
    alert('Please select an image file');
    return;
  }

  status.textContent = 'Reading file...';

  const file = fileInput.files[0];
  const base64 = await fileToBase64(file);

  status.textContent = 'Processing...';

  try {
    const response = await fetch('/api/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64, format: formatSelect.value }),
    });

    if (!response.ok) {
      status.textContent = 'Error during conversion.';
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    downloadLink.href = url;
    downloadLink.download = `result.${formatSelect.value}`;
    downloadLink.style.display = 'inline';

    status.textContent = 'Done! Click below to download.';
  } catch (error) {
    status.textContent = 'An error occurred: ' + error.message;
  }
};

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}
