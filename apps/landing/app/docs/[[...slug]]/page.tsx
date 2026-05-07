import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import {
  MarkdownCopyButton,
  ViewOptionsPopover,
} from "@/components/ai/page-actions";
import { getMDXComponents } from "@/components/mdx";
import { source } from "@/lib/source";

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const page = source.getPage(slug, locale);

  if (!page) notFound();

  const data = page.data as {
    body: React.ComponentType<{
      components: ReturnType<typeof getMDXComponents>;
    }>;
    toc: Parameters<typeof DocsPage>[0]["toc"];
    title: string;
    description?: string;
  };
  const Mdx = data.body;

  return (
    <DocsPage toc={data.toc}>
      <DocsTitle>{data.title}</DocsTitle>
      <DocsDescription>{data.description}</DocsDescription>
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
