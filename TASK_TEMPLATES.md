Implement the full surface of a task TNN (defined in TASKS.md) and only after that, run it by review agent. Create a feature branch for it in format `feature/{taskId}-{taskName}` (all in lowercase). 

Once the task is completed, mark it as done and write me a commit message that will reflect changes within this session in format (in past tense)

```
feat: What was implemented

- List of implemented changes
```

Make sure you strictly follow rule one utility = one file, keep components slim, if anything can be extracted to a separate component, where it doesn't create useless abstraction, do that. 

Once done, run prettier on all modified code.