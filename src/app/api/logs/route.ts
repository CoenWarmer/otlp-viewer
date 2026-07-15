export async function GET() {
  const url = process.env.LOGS_API_URL;

  if (!url) {
    return Response.json(
      {
        error:
          "Logs API url is not set. Make sure LOGS_API_URL is passed in when starting the app.",
      },
      { status: 500 }
    );
  }

  const logsReq = await fetch(url);
  const logs = await logsReq.json();

  return Response.json(logs);
}
