'use client'

import { Files } from "@/components/files";
import { useState, useEffect, useRef } from "react";
import { auth } from "@/app/(auth)/auth";
import { Session } from "next-auth";
import { Message } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { FileIcon, LoadingIcon, TrashIcon, UploadIcon } from "@/components/icons";
import useSWR from "swr";
import { fetcher } from "@/utils/functions";
import cx from "classnames";
import { useRouter } from "next/navigation";

export default function Documents({
    id,
    initialMessages,
    session,
  }: {
    id: string;
    initialMessages: Array<Message>;
    session: Session | null;
  }) {
    const router = useRouter();
    const [selectedFilePathnames, setSelectedFilePathnames] = useState<
    Array<string>
  >([]);
  // const [isFilesVisible, setIsFilesVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [deleteQueue, setDeleteQueue] = useState<Array<string>>([]);
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);
  const inputFileRef = useRef<HTMLInputElement>(null);

  // Fetch files using SWR, similar to Files component
  const {
    data: files,
    mutate,
    isLoading,
  } = useSWR<
    Array<{
      pathname: string;
      url?: string;
    }>
  >("api/files/list", fetcher, {
    fallbackData: [],
  });

  useEffect(() => {
    if (isMounted !== false && session && session.user) {
      localStorage.setItem(
        `${session.user.email}/selected-file-pathnames`,
        JSON.stringify(selectedFilePathnames),
      );
    }
  }, [selectedFilePathnames, isMounted, session]);

  // useEffect(() => {
  //   console.log("Documents component rendered");
  //   setIsMounted(true);
    
  //   // Check if user is admin, redirect if not
  //   if (session && session.user && session.user.role !== 'admin') {
  //     router.replace('/');
  //   }
  // }, [session, router]);

  useEffect(() => {
    if (session && session.user) {
      setSelectedFilePathnames(
        JSON.parse(
          localStorage.getItem(
            `${session.user.email}/selected-file-pathnames`,
          ) || "[]",
        ),
      );
    }
  }, [session]);

  // Add back the conditional rendering to prevent content from showing to non-admins
  // if (!session || !session.user || session.user.role !== 'admin') {
  //   return <div className="flex justify-center items-center h-screen">Nothing to see here 😋</div>;
  // }
    
  return (
    <div className="flex flex-col items-center min-h-screen w-full p-4 pt-[100px]">
      <div className="w-full max-w-4xl flex flex-col gap-6">
        <div className="flex flex-row justify-between w-full">
          <div className="text-xl font-semibold">All Files</div>
          
          <input
            name="file"
            ref={inputFileRef}
            placeholder="Upload a file"
            type="file"
            required
            className="opacity-0 pointer-events-none w-1 absolute"
            accept="application/pdf"
            multiple={false}
            onChange={async (event) => {
              const file = event.target.files![0];

              if (file) {
                setUploadQueue((currentQueue) => [...currentQueue, file.name]);

                await fetch(`/api/files/upload?filename=${file.name}`, {
                  method: "POST",
                  body: file,
                });

                setUploadQueue((currentQueue) =>
                  currentQueue.filter((filename) => filename !== file.name),
                );

                mutate([...(files || []), { pathname: file.name }]);
              }
            }}
          />
          
          <button
            className="bg-zinc-900 text-zinc-50 hover:bg-zinc-800 flex flex-row gap-2 items-center dark:text-zinc-800 text-sm dark:bg-zinc-100 rounded-md p-1 px-3 dark:hover:bg-zinc-200 cursor-pointer"
            onClick={() => {
              inputFileRef.current?.click();
            }}
          >
            <UploadIcon size={16} />
            <span>Upload A File</span>
          </button>
        </div>

        {/* Files Table */}
        <div className="w-full overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-zinc-800 rounded-lg overflow-hidden shadow">
            <thead className="bg-gray-100 dark:bg-zinc-700">
              <tr>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 dark:text-gray-200">File Name</th>
                <th className="py-3 px-4 text-right text-sm font-medium text-gray-600 dark:text-gray-200">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
              {isLoading ? (
                <tr>
                  <td colSpan={2} className="py-4 px-4 text-center">
                    <div className="flex justify-center">
                      <LoadingIcon />
                    </div>
                  </td>
                </tr>
              ) : files && files.length > 0 ? (
                files.map((file) => (
                  <tr 
                    key={file.pathname} 
                    className={cx(
                      "hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors",
                      selectedFilePathnames.includes(file.pathname) ? "bg-blue-50 dark:bg-zinc-700" : ""
                    )}
                  >
                    <td 
                      className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                      onClick={() => {
                        setSelectedFilePathnames((currentSelections) => {
                          if (currentSelections.includes(file.pathname)) {
                            return currentSelections.filter(
                              (path) => path !== file.pathname,
                            );
                          } else {
                            return [...currentSelections, file.pathname];
                          }
                        });
                      }}
                    >
                      {file.pathname}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30"
                        onClick={async () => {
                          setDeleteQueue((currentQueue) => [
                            ...currentQueue,
                            file.pathname,
                          ]);

                          await fetch(`/api/files/delete?fileurl=${file.url}`, {
                            method: "DELETE",
                          });

                          setDeleteQueue((currentQueue) =>
                            currentQueue.filter(
                              (filename) => filename !== file.pathname,
                            ),
                          );

                          setSelectedFilePathnames((currentSelections) =>
                            currentSelections.filter((path) => path !== file.pathname),
                          );

                          mutate(files.filter((f) => f.pathname !== file.pathname));
                        }}
                      >
                        {deleteQueue.includes(file.pathname) ? (
                          <LoadingIcon />
                        ) : (
                          <TrashIcon size={16} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="py-8 px-4 text-center text-gray-500 dark:text-gray-400">
                    No files found. Click the &apos;Upload A File&apos; button to add files.
                  </td>
                </tr>
              )}
              
              {/* Show uploading files in the table */}
              {uploadQueue.map((fileName) => (
                <tr key={fileName} className="bg-blue-50 dark:bg-blue-900/20">
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                    {fileName} <span className="text-blue-500 ml-2">(Uploading...)</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="animate-spin inline-block">
                      <LoadingIcon />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
