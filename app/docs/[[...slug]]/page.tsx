import { source } from "@/lib/source";
import { notFound } from "next/navigation";
import {
  DocsPage,
  DocsBody,
  DocsTitle,
  DocsDescription,
} from "fumadocs-ui/layouts/docs/page";
import { getMDXComponents } from "@/components/mdx";
import {
  MarkdownCopyButton,
  ViewOptionsPopover,
} from "@/components/ai/page-actions";

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const page = source.getPage(slug);

  if (!page) notFound();

  const Mdx = page.data.body;

  return (
    <DocsPage toc={page.data.toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <div className="flex flex-row items-center gap-2 border-b pt-2 pb-6">
        <MarkdownCopyButton markdownUrl={`${page.url}.mdx`} />
        <ViewOptionsPopover markdownUrl={`${page.url}.mdx`} />
      </div>
      <DocsBody>
        <Mdx components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}
