"use client"

import { useEffect, useRef } from "react"
import QRCode from "qrcode"

export default function QRCodeDisplay({ url }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (canvasRef.current && url) {
      QRCode.toCanvas(
        canvasRef.current,
        url,
        {
          width: 200,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        },
        (error) => {
          if (error) console.error(error)
        },
      )
    }
  }, [url])

  return (
    <div className="p-4 bg-white rounded-lg">
      <canvas ref={canvasRef} />
    </div>
  )
}
