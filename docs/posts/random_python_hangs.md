---
title: "TIL: how to debug randomly hanging Python applications"
date: 2022-06-29
categories:
  - Python
  - Optimizations
  - Tooling
---

Usually, if a Python-based application hangs, you either read logs or grab one of the PBD-based solutions, attaching to the application, and uses the Python console for investigation. The approach is straightforward; for example, you installed <inl_code>pdb-attach</inl_code>, and add a few lines to your application:

```python
import pdb_attach
pdb_attach.listen(50000)
```

and expect that "magic" will just works:

```
> python -m pdb_attach <PID> 50000
(Pdb) YOU HAVE PDB SESSION HERE
```

But sometimes, magic is broken, and my theory is (I didn't search for proof) that this is due to GIL. So, sometimes, no PDB prompt after you have attached to the application with PDB. In my case, the application hang in the `multiprocessing.Process` call where I used a gRPC server. The gRPC server didn't react to the termination request, the process cannot stop, and like aggravating circumstances, all these are a part of PyTest that hang 1 of 20 executions.

This is a general PDB-based debuggers issue, which means all other tools like `pyrasite-shell` and PyTest PBD integration also don't work. The only option here is GDB for Python, which is surprisingly amazing! First of all, you need to install Python extension for GDB.

```bash
sudo apt-get install python3.9-dbg
```

Then you can connect to your Python application which is a regular Python process with GDB, and explore the call-stack!

```
> gdb

(GDB) attach <PID>
(GDB) py-bt
```

If you use not APT-based Linux, search for proper instruction [here](https://wiki.python.org/moin/DebuggingWithGdb).