export default async function VerifiedPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const status = params?.status || "";
  const title = status === "success" ? "Subscription Confirmed" : status === "expired" ? "Link Expired" : "Invalid Link";
  const message = status === "success"
    ? "Thanks! Your newsletter subscription is confirmed."
    : status === "expired"
    ? "Your verification link has expired. Please resubscribe."
    : "Verification link is invalid.";
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-3 text-gray-600">{message}</p>
    </div>
  );
}
