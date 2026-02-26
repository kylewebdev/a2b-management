"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface ItemLabelProps {
  itemId: string;
  estateId: string;
  salePrice: number | null;
  baseUrl: string;
}

export function ItemLabel({ itemId, estateId, salePrice, baseUrl }: ItemLabelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const itemUrl = `${baseUrl}/estates/${estateId}/items/${itemId}`;

  useEffect(() => {
    QRCode.toDataURL(itemUrl, {
      width: 128,
      margin: 1,
      color: { dark: "#000000", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
    }).then(setQrDataUrl);
  }, [itemUrl]);

  const priceText = salePrice != null ? `$${salePrice.toLocaleString()}` : "See Cashier";

  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-border bg-white p-3"
      data-testid="item-label"
    >
      <div className="flex-shrink-0">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="QR code"
            className="h-20 w-20"
            data-testid="label-qr"
          />
        ) : (
          <div className="h-20 w-20 bg-gray-200" />
        )}
      </div>
      <p
        className="text-lg font-bold text-gray-900"
        data-testid="label-price"
      >
        {priceText}
      </p>
    </div>
  );
}
