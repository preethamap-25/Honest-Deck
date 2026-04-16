import { useState } from "react";

function App() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState("");
  const increment = () => {
    setCount(count + 1);
  };
  const handle = (event) => {
    setText(event.target.value + " ");
  };

  return (
    <>
      <div className="h-screen flex justify-center items-center gap-5">
        <button className="mt-[10px] text-blue-500" onClick={increment}>
          {count}
        </button>
        <input
          type="text"
          className="bg-blue-400 rounded-xl p-[5px] text-white text-xl"
          onChange={handle}
        />
        <h1 className="text-4xl text-blue-500">{text + count}</h1>
      </div>
    </>
  );
}

export default App;
