import { NextResponse } from "next/server";
import sharp from "sharp";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = (formData.get("pfp") || formData.get("file")) as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Convert uploaded file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const pfpBuffer = Buffer.from(arrayBuffer);

    // Load bandana.png from /public
    // NOTE: Ensure your bandana image file is named 'bandana.png' and is in the 'public' folder.
    const bandanaPath = path.join(process.cwd(), "public", "bandana.png");
    const bandanaBuffer = fs.readFileSync(bandanaPath);

    // Standard canvas size for all PFPs
    const CANVAS_SIZE = 512;

    // Resize PFP to fit canvas exactly
    const resizedPfpBuffer = await sharp(pfpBuffer)
      .resize(CANVAS_SIZE, CANVAS_SIZE, { fit: "cover" })
      .png()
      .toBuffer();

    // Resize bandana to <= canvas size
    let bandanaResized = await sharp(bandanaBuffer)
      .resize({
        width: Math.floor(CANVAS_SIZE * 0.55),
        // Removed the height constraint to use the bandana's original aspect ratio.
        fit: "inside",
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();

    // Get actual bandana size
    const bandanaMeta = await sharp(bandanaResized).metadata();
    let bandanaW = bandanaMeta.width || CANVAS_SIZE;
    // Set a reasonable fallback height, though the actual height is determined by the aspect ratio above.
    let bandanaH = bandanaMeta.height || Math.floor(CANVAS_SIZE * 0.05); 

    // SAFETY: clamp bandana to always fit in 512x512
    if (bandanaW > CANVAS_SIZE) bandanaW = CANVAS_SIZE;
    if (bandanaH > CANVAS_SIZE) bandanaH = CANVAS_SIZE;

    bandanaResized = await sharp(bandanaResized)
      .resize(bandanaW, bandanaH, { fit: "inside" })
      .png()
      .toBuffer();

    // Final position (center horizontally)
    const bandanaX = Math.max(0, Math.floor((CANVAS_SIZE - bandanaW) / 2));
    
    // FIX 4: Reverting to 5% (0.05) from the top. This is 1/2 way between 7.5% (too low) and 2% (too high).
    const bandanaY = Math.floor(CANVAS_SIZE * 0.05);

    // --- Composite everything onto a guaranteed transparent canvas ---
    const processedImageBuffer = await sharp({
      create: {
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        { input: resizedPfpBuffer, top: 0, left: 0 },
        { input: bandanaResized, top: bandanaY, left: bandanaX },
      ])
      .png()
      .toBuffer();

    return new NextResponse(processedImageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'inline; filename="bandana-pfp.png"',
      },
    });
  } catch (err: any) {
    console.error("FATAL Image processing error details:", err);
    return NextResponse.json(
      { error: "Image processing failed", details: err.message },
      { status: 500 }
    );
  }
}
