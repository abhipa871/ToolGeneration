import { Children, isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./code-block";

type CodeElementProps = {
  className?: string;
  children?: ReactNode;
  node?: { data?: { meta?: string } };
};

function MarkdownCodeBlock({ children }: { children?: ReactNode }) {
  const child = Children.toArray(children)[0];
  if (!isValidElement<CodeElementProps>(child)) return <pre>{children}</pre>;
  const language = child.props.className?.match(/language-([^\s]+)/)?.[1];
  const code = String(child.props.children ?? "").replace(/\n$/, "");
  return <CodeBlock code={code} language={language} metadata={child.props.node?.data?.meta} />;
}

export function MessageContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noreferrer noopener">
            {children}
          </a>
        ),
        pre: MarkdownCodeBlock,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
