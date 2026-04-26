
import axios from "axios";

export async function uploadToS3(file: File): Promise<string> {
    try {
        const { data } = await axios.post('/api/upload', {
            fileName: file.name,
            fileType: file.type
        })

        const { signedUrl, fileUrl } = data

        await axios.put(signedUrl, file, {
            headers: {
                'Content-Type': file.type
            }
        })

        return fileUrl
    } catch (error) {
        console.error("Error uploading to S3:", error)
        throw error
    }
}
