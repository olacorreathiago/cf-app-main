import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TrialsPage({ params }: Props) {
  const { slug } = await params;
  redirect(`/box/${slug}/members`);
}
