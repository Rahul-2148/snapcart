export default async function UnsubscribedPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const status = params?.status || "";
  const title = status === "success" ? "Unsubscribed" : "Invalid Request";
  const message = status === "success"
    ? "You've been unsubscribed from Snapcart newsletters."
    : "Unsubscribe request is invalid."
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-3 text-gray-600">{message}</p>
    </div>
  );
}
