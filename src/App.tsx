import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { Feed } from "./feed/Feed";
import { CreateSandbox } from "./create/CreateSandbox";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Feed />} />
        <Route path="/create" element={<CreateSandbox />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
