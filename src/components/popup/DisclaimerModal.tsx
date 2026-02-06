import React, { useCallback, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import disclaimerText from '../../../免责声明.md?raw';

const DisclaimerModal = ({
  defaultDontShowAgain = false,
  allowDontShowAgain = true,
  onAgree,
  onCancel,
}: {
  defaultDontShowAgain?: boolean;
  allowDontShowAgain?: boolean;
  onAgree: (opts: { dontShowAgain: boolean }) => void;
  onCancel: (opts: { dontShowAgain: boolean }) => void;
}) => {
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(defaultDontShowAgain);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const handleTocClick = useCallback((href?: string, event?: React.MouseEvent<HTMLAnchorElement>) => {
    if (!href || !href.startsWith('#')) return;
    event?.preventDefault();

    const rawId = decodeURIComponent(href.slice(1));
    const container = contentRef.current;
    if (!container) return;

    // 转义成安全的 CSS 选择器
    const safeId = rawId.replace(/([ #.;?+*~'"!^$[\]()=>|/@])/g, '\\$1');
    const target = container.querySelector<HTMLElement>(`#${safeId}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-3xl max-h-[80vh] rounded-2xl bg-base-100 text-base-content shadow-2xl border border-base-300 overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-base-300">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold text-base-content">PoeLink 使用免责声明</h3>
            <p className="text-xs text-base-content/70">
              为保障你的合法权益，请先阅读下方关键信息与完整法律条款，再决定是否继续使用本插件。
            </p>
          </div>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1 bg-base-100">
          <div
            ref={contentRef}
            className="max-w-3xl mx-auto text-sm leading-6 text-base-content/80 space-y-4"
          >
            <div className="rounded-xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
              <h4 className="text-xs font-semibold tracking-wide text-base-content/70 mb-2">关键信息摘要</h4>
              <ul className="list-disc pl-5 space-y-1 text-xs text-base-content/70">
                <li>本插件为个人学习研究性质的第三方浏览器扩展，与海康威视/海康机器人等权利方无官方隶属或授权关系。</li>
                <li>插件仅在用户已合法登录且具备系统使用授权的前提下，对浏览器中已公开渲染的界面元素进行自动化操作，不破解、不绕过任何技术保护措施。</li>
                <li>你需自行评估合规性与业务风险；如不同意或无法接受声明内容，请立即卸载并停止使用本插件。</li>
              </ul>
            </div>

            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSlug]}
                components={{
                  a: ({ href, children, ...props }) => (
                    // 自定义目录内链接的点击行为，让其滚动到弹窗内部对应位置
                    <a
                      href={href}
                      {...props}
                      onClick={(e) => {
                        if (href?.startsWith('#')) {
                          handleTocClick(href, e);
                        }
                      }}
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {disclaimerText}
              </ReactMarkdown>
            </div>
          </div>
        </div>
        {allowDontShowAgain && (
          <div className="px-5 pb-4">
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
              />
              <span className="label-text">下次进入不显示</span>
            </label>
          </div>
        )}
        <div className="px-5 py-4 border-t border-base-300 flex items-center justify-end gap-3">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onCancel({ dontShowAgain })}
          >
            取消
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onAgree({ dontShowAgain })}
          >
            同意
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisclaimerModal;
