import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { S3client } from "../../lib/s3/index";
import "server-only"
import { BUCKET_NAME } from "./utils";



export const deleteFile = async (key: string) => {

    const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    })

    await S3client.send(command)
}


