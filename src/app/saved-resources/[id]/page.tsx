import SavedResourceDetailClient from "./saved-resource-detail-client";

export default function SavedResourceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = typeof params?.id === "string" ? params.id : "";
  if (!id) {
    return (
      <div className="flex-1 p-4 md:p-8">
        <p className="text-muted-foreground">Invalid resource link.</p>
      </div>
    );
  }
  return <SavedResourceDetailClient id={id} />;
}
