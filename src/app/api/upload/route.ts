
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { type NextRequest, NextResponse } from "next/server"

const s3 = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
})

export async function POST(req: NextRequest) {
    try {

        const { fileName, fileType } = await req.json()

        if (!fileName || !fileType) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const uniqueFileName = `${Date.now()}-${fileName}`

        const putObjectCommand = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: uniqueFileName,
            ContentType: fileType,
        })

        const signedUrl = await getSignedUrl(s3, putObjectCommand, { expiresIn: 3600 })

        return NextResponse.json({
            signedUrl,
            fileUrl: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFileName}`
        })
    } catch (error) {
        console.error("Error generating signed URL:", error)
        return NextResponse.json({ error: "Error generating signed URL" }, { status: 500 })
    }
}
