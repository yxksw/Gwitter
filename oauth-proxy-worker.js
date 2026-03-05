/**
 * Cloudflare Worker - GitHub OAuth Proxy
 *
 * 部署步骤：
 * 1. 登录 Cloudflare Dashboard (https://dash.cloudflare.com)
 * 2. 进入 Workers & Pages
 * 3. 点击 "Create application" -> "Create Worker"
 * 4. 给 Worker 起个名字（如：github-oauth-proxy）
 * 5. 点击 "Deploy" 部署默认代码
 * 6. 点击 "Edit code" 编辑代码
 * 7. 将下面的代码全部复制粘贴进去
 * 8. 点击 "Save and deploy"
 * 9. 复制 Worker 的 URL（如：https://github-oauth-proxy.yourname.workers.dev）
 * 10. 更新 Gwitter 配置中的 autoProxy 为这个 URL
 */

export default {
  async fetch(request, _env, _ctx) {
    // 设置 CORS 头
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // 处理预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // 只处理 POST 请求
    if (request.method !== 'POST') {
      return new Response('Method not allowed', {
        status: 405,
        headers: corsHeaders,
      });
    }

    try {
      // 获取请求体
      const body = await request.text();

      // 转发请求到 GitHub OAuth API
      const response = await fetch(
        'https://github.com/login/oauth/access_token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          body: body,
        },
      );

      // 获取响应
      const responseBody = await response.text();

      // 返回给客户端
      return new Response(responseBody, {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
  },
};
