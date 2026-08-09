import type { ResourceFile } from "@/types";
import {
  copyrightStatusZh,
  resourceFileTypeZh,
  visibilityZh,
} from "@/lib/display";

type VersionFileListProps = {
  files: ResourceFile[];
};

function normalizeSnapshotFileUrl(fileUrl?: string) {
  const trimmedFileUrl = fileUrl?.trim() ?? "";

  if (!trimmedFileUrl) {
    return "";
  }

  if (
    trimmedFileUrl.startsWith("/") ||
    trimmedFileUrl.startsWith("http://") ||
    trimmedFileUrl.startsWith("https://")
  ) {
    return trimmedFileUrl;
  }

  return `/${trimmedFileUrl}`;
}

function canOpenSnapshotFile(normalizedFileUrl: string) {
  return normalizedFileUrl.startsWith("/snapshots/");
}

export function VersionFileList({ files }: VersionFileListProps) {
  if (files.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        暂无该版本的关联备份文件。
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {files.map((file) => {
        const normalizedFileUrl = normalizeSnapshotFileUrl(file.fileUrl);
        const hasOpenableSnapshotFile =
          file.visibility === "public" && canOpenSnapshotFile(normalizedFileUrl);

        return (
          <div
            key={file.id}
            className="rounded-lg border border-zinc-100 p-4 dark:border-zinc-800"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {file.fileName}
                </h4>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {resourceFileTypeZh[file.fileType]} · {visibilityZh[file.visibility]} ·{" "}
                  {copyrightStatusZh[file.copyrightStatus]}
                </p>
              </div>
              {hasOpenableSnapshotFile ? (
                <a
                  href={normalizedFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  查看备份文件
                </a>
              ) : file.visibility === "public" && normalizedFileUrl ? (
                <span className="max-w-48 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  该记录的 fileUrl 未指向当前可公开访问的快照目录
                </span>
              ) : file.visibility === "public" ? (
                <span className="max-w-48 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  该备份文件暂未记录可打开的站内路径
                </span>
              ) : (
                <span className="max-w-48 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  本站已保存该版本快照，但暂不公开展示
                </span>
              )}
            </div>
            <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">采集时间</dt>
                <dd className="mt-0.5 text-zinc-900 dark:text-zinc-50">
                  {file.capturedAt}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">文件校验值</dt>
                <dd className="mt-0.5 break-all text-zinc-900 dark:text-zinc-50">
                  {file.checksum}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              {file.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
