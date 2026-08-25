/**
 * Folha de QR Codes de mesa pra imprimir e recortar — sem estilo de tela, isolada via @media
 * print (ver printTableQrCodes.tsx), mesmo princípio de OrderReceipt.tsx.
 */
export function TableQrSheet({
  storeName,
  items,
}: {
  storeName: string
  items: { tableNumber: string; dataUrl: string }[]
}) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#000', width: '100%' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12mm',
        }}
      >
        {items.map((item) => (
          <div
            key={item.tableNumber}
            style={{
              textAlign: 'center',
              border: '1px dashed #999',
              borderRadius: 8,
              padding: '6mm',
              breakInside: 'avoid',
            }}
          >
            <img
              src={item.dataUrl}
              alt={`QR Code mesa ${item.tableNumber}`}
              style={{ width: '100%', maxWidth: 200, height: 'auto' }}
            />
            <div style={{ marginTop: 8, fontWeight: 'bold', fontSize: 14 }}>{storeName}</div>
            <div style={{ fontSize: 16, fontWeight: 'bold' }}>Mesa {item.tableNumber}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
