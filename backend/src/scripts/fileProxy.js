/**
 * MinIO 文件代理路由
 * 
 * GET /api/files/:objectPath(*)
 * 
 * 当 MinIO 桶设置为公开只读时，前端可直接通过 MINIO_PUBLIC_URL 访问文件。
 * 此路由作为备选方案，用于：
 * 1. MinIO 桶未公开时，通过后端代理访问
 * 2. 需要鉴权控制文件访问时
 */

const express = require('express');
const router = express.Router();

let minioClient = null;
let bucket = null;

function getMinioClient() {
  if (minioClient) return minioClient;

  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;
  if (!accessKey || !secretKey) return null;

  const Minio = require('minio');
  minioClient = new Minio.Client({
    endPoint:  process.env.MINIO_ENDPOINT || 'localhost',
    port:      parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL:    process.env.MINIO_USE_SSL === 'true',
    accessKey,
    secretKey,
  });
  bucket = process.env.MINIO_BUCKET || 'nanostory';
  return minioClient;
}

// GET /api/files/images/frames/123/first_frame.png
router.get('/*', async (req, res) => {
  const client = getMinioClient();
  if (!client) {
    return res.status(503).json({ message: '文件存储服务未配置' });
  }

  // req.params[0] 获取通配符匹配的路径
  const objectPath = req.params[0];
  if (!objectPath) {
    return res.status(400).json({ message: '缺少文件路径' });
  }

  try {
    // 获取对象元信息
    const stat = await client.statObject(bucket, objectPath);

    // 设置响应头
    if (stat.metaData && stat.metaData['content-type']) {
      res.setHeader('Content-Type', stat.metaData['content-type']);
    }
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    // 流式传输文件
    const stream = await client.getObject(bucket, objectPath);
    stream.pipe(res);
  } catch (err) {
    if (err.code === 'NoSuchKey' || err.code === 'NotFound') {
      return res.status(404).json({ message: '文件不存在' });
    }
    console.error('[FileProxy] 获取文件失败:', err.message);
    res.status(500).json({ message: '获取文件失败' });
  }
});

module.exports = router;
