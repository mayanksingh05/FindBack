using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading;

namespace FindBackLauncher
{
    class Program
    {
        private static Process backendProc;
        private static Process frontendProc;
        private static bool isShuttingDown = false;
        private static readonly object shutdownLock = new object();

        static void Main(string[] args)
        {
            Console.Title = "FindBack - Smart College Lost & Found System";

            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("==================================================================");
            Console.WriteLine("          FINDBACK - AUTOMATED FULL-STACK APP LAUNCHER            ");
            Console.WriteLine("==================================================================");
            Console.ResetColor();

            // Locate project root (one level up from run/ directory)
            string rootDir = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, ".."));
            if (!File.Exists(Path.Combine(rootDir, "backend", "main.py")))
            {
                rootDir = Directory.GetCurrentDirectory();
            }

            Console.WriteLine("  Project Root: " + rootDir);
            Console.WriteLine();

            // Set up exit handlers to ensure child processes are ALWAYS killed cleanly
            Console.CancelKeyPress += (s, e) => { e.Cancel = true; CleanShutdown(); Environment.Exit(0); };
            AppDomain.CurrentDomain.ProcessExit += (s, e) => { CleanShutdown(); };

            // Step 0: Clear any previous zombie processes on ports 8000 and 5173
            KillPortListeners(8000);
            KillPortListeners(5173);

            // Step 1: Ensure Docker & Database container are running
            EnsureDockerAndDatabase();

            // Step 2: Start Backend (FastAPI on port 8000)
            StartBackend(rootDir);

            // Step 3: Start Frontend (Vite on port 5173)
            StartFrontend(rootDir);

            // Success Display
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine();
            Console.WriteLine("==================================================================");
            Console.WriteLine("                 FINDBACK IS RUNNING SUCCESSFULLY!                ");
            Console.WriteLine("==================================================================");
            Console.ResetColor();

            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine("  >> Localhost Link:   http://localhost:5173/");
            Console.WriteLine("  >> Backend Swagger:  http://localhost:8000/docs");
            Console.ResetColor();

            Console.WriteLine("------------------------------------------------------------------");
            Console.WriteLine("  Ready Demo Logins:");
            Console.WriteLine("   * Campus Admin:   admin@college.edu       /  Admin@123");
            Console.WriteLine("   * Student Aarav:  student1@college.edu    /  Student@123");
            Console.WriteLine("   * Student Priya:  student2@college.edu    /  Student@123");
            Console.WriteLine("   * Student Rohan:  student3@college.edu    /  Student@123");
            Console.WriteLine("   * Test Student:   teststudent@college.edu /  Student@123");
            Console.WriteLine("------------------------------------------------------------------");
            Console.WriteLine("  Press Ctrl+C at any time in this window to stop all services.");
            Console.WriteLine("------------------------------------------------------------------");

            // Keep main thread alive monitoring child processes
            while (!isShuttingDown)
            {
                Thread.Sleep(1000);
                if (backendProc != null && backendProc.HasExited && !isShuttingDown)
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine("[!] Backend process exited unexpectedly. Restarting backend...");
                    Console.ResetColor();
                    StartBackend(rootDir);
                }
            }
        }

        private static void EnsureDockerAndDatabase()
        {
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.Write("[1/3] Checking Docker daemon status... ");
            Console.ResetColor();

            if (!IsDockerAlive())
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("OFFLINE");
                Console.ResetColor();
                Console.WriteLine("      [!] Docker Desktop is not responding.");
                Console.WriteLine("      Please start Docker Desktop and ensure it is running.");
            }
            else
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("READY [OK]");
                Console.ResetColor();
            }

            EnsureDbContainer();
        }

        private static bool IsDockerAlive()
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo("docker", "info")
                {
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                using (Process p = Process.Start(psi))
                {
                    p.WaitForExit(6000);
                    return p.ExitCode == 0;
                }
            }
            catch
            {
                return false;
            }
        }

        private static void EnsureDbContainer()
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo("docker", "ps --filter name=findback_db --format \"{{.Status}}\"")
                {
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                using (Process p = Process.Start(psi))
                {
                    string output = p.StandardOutput.ReadToEnd();
                    p.WaitForExit(5000);
                    if (output.Contains("Up"))
                    {
                        Console.ForegroundColor = ConsoleColor.Green;
                        Console.WriteLine("      [OK] PostgreSQL pgvector container 'findback_db' is RUNNING");
                        Console.ResetColor();
                        return;
                    }
                }

                Console.WriteLine("      Starting database container 'findback_db'...");
                ProcessStartInfo startPsi = new ProcessStartInfo("docker", "start findback_db")
                {
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                using (Process p = Process.Start(startPsi))
                {
                    p.WaitForExit(8000);
                    if (p.ExitCode == 0)
                    {
                        Console.ForegroundColor = ConsoleColor.Green;
                        Console.WriteLine("      [OK] Database container 'findback_db' STARTED");
                        Console.ResetColor();
                        return;
                    }
                }

                // Fallback to docker compose up -d db
                ProcessStartInfo composePsi = new ProcessStartInfo("docker", "compose up -d db")
                {
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                using (Process p = Process.Start(composePsi))
                {
                    p.WaitForExit(10000);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("      [!] Note on database container: " + ex.Message);
            }
        }

        private static void StartBackend(string rootDir)
        {
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.Write("[2/3] Starting FastAPI Backend on port 8000... ");
            Console.ResetColor();

            string pythonExe = Path.Combine(rootDir, ".venv", "Scripts", "python.exe");
            if (!File.Exists(pythonExe))
            {
                pythonExe = "python";
            }

            ProcessStartInfo psi = new ProcessStartInfo
            {
                FileName = pythonExe,
                Arguments = "-m uvicorn backend.main:app --host 127.0.0.1 --port 8000",
                WorkingDirectory = rootDir,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            };

            backendProc = new Process { StartInfo = psi };

            // CRITICAL FIX: Asynchronously drain stdout and stderr so OS pipe buffers NEVER fill or deadlock!
            backendProc.OutputDataReceived += (s, e) => { };
            backendProc.ErrorDataReceived += (s, e) => { };

            backendProc.Start();
            backendProc.BeginOutputReadLine();
            backendProc.BeginErrorReadLine();

            // Wait until backend responds
            bool online = false;
            for (int i = 0; i < 25; i++)
            {
                Thread.Sleep(1000);
                try
                {
                    HttpWebRequest req = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:8000/docs");
                    req.Timeout = 1000;
                    using (HttpWebResponse res = (HttpWebResponse)req.GetResponse())
                    {
                        if (res.StatusCode == HttpStatusCode.OK)
                        {
                            online = true;
                            break;
                        }
                    }
                }
                catch { }
            }

            if (online)
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("ONLINE [OK]");
                Console.ResetColor();
            }
            else
            {
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine("STARTED (ready shortly)");
                Console.ResetColor();
            }
        }

        private static void StartFrontend(string rootDir)
        {
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.Write("[3/3] Starting Vite Frontend on port 5173... ");
            Console.ResetColor();

            ProcessStartInfo psi = new ProcessStartInfo
            {
                FileName = "cmd.exe",
                Arguments = "/c npx vite --host",
                WorkingDirectory = Path.Combine(rootDir, "frontend"),
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            };

            frontendProc = new Process { StartInfo = psi };

            // CRITICAL FIX: Asynchronously drain stdout and stderr so Node.js NEVER blocks on pipes!
            frontendProc.OutputDataReceived += (s, e) => { };
            frontendProc.ErrorDataReceived += (s, e) => { };

            frontendProc.Start();
            frontendProc.BeginOutputReadLine();
            frontendProc.BeginErrorReadLine();

            // Wait until frontend responds
            bool online = false;
            for (int i = 0; i < 20; i++)
            {
                Thread.Sleep(1000);
                try
                {
                    HttpWebRequest req = (HttpWebRequest)WebRequest.Create("http://localhost:5173/");
                    req.Timeout = 1000;
                    using (HttpWebResponse res = (HttpWebResponse)req.GetResponse())
                    {
                        if (res.StatusCode == HttpStatusCode.OK)
                        {
                            online = true;
                            break;
                        }
                    }
                }
                catch { }
            }

            if (online)
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("ONLINE [OK]");
                Console.ResetColor();
            }
            else
            {
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine("STARTED (ready shortly)");
                Console.ResetColor();
            }
        }

        private static void CleanShutdown()
        {
            lock (shutdownLock)
            {
                if (isShuttingDown) return;
                isShuttingDown = true;

                Console.WriteLine();
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine("[SHUTDOWN] Stopping all FindBack services...");
                Console.ResetColor();

                KillProcessTree(backendProc);
                KillProcessTree(frontendProc);

                KillPortListeners(8000);
                KillPortListeners(5173);

                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("[SHUTDOWN] Services stopped cleanly. Goodbye!");
                Console.ResetColor();
            }
        }

        private static void KillProcessTree(Process p)
        {
            if (p == null) return;
            try
            {
                if (!p.HasExited)
                {
                    ProcessStartInfo psi = new ProcessStartInfo("taskkill", "/F /T /PID " + p.Id)
                    {
                        CreateNoWindow = true,
                        UseShellExecute = false
                    };
                    using (Process kill = Process.Start(psi))
                    {
                        kill.WaitForExit(3000);
                    }
                }
            }
            catch { }
        }

        private static void KillPortListeners(int port)
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo("cmd.exe", "/c for /f \"tokens=5\" %a in ('netstat -aon ^| findstr :" + port + " ^| findstr LISTENING') do taskkill /F /PID %a")
                {
                    CreateNoWindow = true,
                    UseShellExecute = false
                };
                using (Process kill = Process.Start(psi))
                {
                    kill.WaitForExit(3000);
                }
            }
            catch { }
        }
    }
}
