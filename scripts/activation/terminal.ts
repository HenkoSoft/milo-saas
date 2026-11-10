import { ActivationError, ensure } from "./plan";
import { StringDecoder } from "node:string_decoder";

export function readHidden(prompt: string, input = process.stdin, output = process.stdout): Promise<string> {
  ensure(input.isTTY && output.isTTY && typeof input.setRawMode === "function", "INTERACTIVE_TERMINAL_REQUIRED");
  return new Promise((resolve, reject) => {
    let value = "";
    let settled = false;
    const decoder = new StringDecoder("utf8");
    const wasRaw = !!input.isRaw;
    const wasPaused = input.isPaused();
    function finish(error?: ActivationError) {
      if (settled) return;
      settled = true;
      input.removeListener("data", onData);
      input.removeListener("end", onEnd);
      input.removeListener("error", onInputError);
      process.removeListener("SIGINT", onInterrupt);
      process.removeListener("SIGTERM", onInterrupt);
      input.setRawMode(wasRaw);
      if (wasPaused) input.pause();
      output.write("\n");
      if (error) { value = ""; reject(error); }
      else resolve(value);
    }
    function onEnd() { finish(new ActivationError("INPUT_CLOSED")); }
    function onInputError() { finish(new ActivationError("INPUT_FAILED")); }
    function onInterrupt() { finish(new ActivationError("CANCELLED")); }
    function onData(chunk: Buffer | string) {
      for (const char of typeof chunk === "string" ? chunk : decoder.write(chunk)) {
        if (char === "\u0003" || char === "\u001b") { onInterrupt(); return; }
        if (char === "\r" || char === "\n") { finish(); return; }
        if (char === "\b" || char === "\u007f") { value = Array.from(value).slice(0, -1).join(""); continue; }
        if (char < " ") { finish(new ActivationError("INPUT_CONTROL_CHARACTER")); return; }
        value += char;
        if (value.length > 128) { finish(new ActivationError("PASSWORD_LENGTH_INVALID")); return; }
      }
    }
    output.write(prompt);
    input.setRawMode(true);
    input.on("data", onData);
    input.once("end", onEnd);
    input.once("error", onInputError);
    process.once("SIGINT", onInterrupt);
    process.once("SIGTERM", onInterrupt);
    input.resume();
  });
}

export async function passwordPrompt() {
  let first = await readHidden("Contraseña (oculta): ");
  const second = await readHidden("Confirmá la contraseña (oculta): ");
  ensure(first === second, "PASSWORD_CONFIRMATION_MISMATCH");
  ensure(first.length >= 8 && first.length <= 128, "PASSWORD_LENGTH_INVALID");
  const result = first;
  first = "";
  return result;
}
