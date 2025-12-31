import Editor from "./components/Editor";

export default function Home() {
  return (
    <div className="h-screen w-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="h-full w-full bg-white dark:bg-black">
        <Editor />
      </main>
    </div>
  );
}
