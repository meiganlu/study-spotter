export function infoWindowHtml(spot: {
  name: string;
  vicinity: string;
  rating?: number;
}) {
  return `
    <div style="padding:12px; font-family: system-ui;">
      <h3 style="font-size:16px; color:#2C4A3E; font-weight:500; margin-bottom:4px;">
        ${escapeHtml(spot.name)}
      </h3>
      <p style="font-size:14px; color:#515D5A; margin:4px 0;">
        ${escapeHtml(spot.vicinity)}
      </p>
      ${spot.rating ? `<p style="font-size:14px; color:#515D5A; margin:4px 0;">Rating: ${spot.rating} / 5</p>` : ""}
    </div>
  `;
}

function escapeHtml(unsafe: string) {
  return unsafe.replace(/[&<>"'`=\/]/g, function (s) {
    return ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    } as any)[s];
  });
}
