using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Reflection;
using System.Threading.Tasks;

public class Verification
{

    private static readonly Dictionary<string, Type> TypeMapping;

    private TimeSpan timespan;

    static Verification()
    {
        TypeMapping = new Dictionary<string, Type>();
        TypeMapping.Add("void", typeof(void));
        TypeMapping.Add("boolean", typeof(bool));
        TypeMapping.Add("byte", typeof(byte));
        TypeMapping.Add("short", typeof(short));
        TypeMapping.Add("int", typeof(int));
        TypeMapping.Add("long", typeof(long));
        TypeMapping.Add("char", typeof(char));
        TypeMapping.Add("float", typeof(float));
        TypeMapping.Add("double", typeof(double));
        TypeMapping.Add("String", typeof(string));
        TypeMapping.Add("boolean[]", typeof(bool[]));
        TypeMapping.Add("byte[]", typeof(byte[]));
        TypeMapping.Add("short[]", typeof(short[]));
        TypeMapping.Add("int[]", typeof(int[]));
        TypeMapping.Add("long[]", typeof(long[]));
        TypeMapping.Add("char[]", typeof(char[]));
        TypeMapping.Add("float[]", typeof(float[]));
        TypeMapping.Add("double[]", typeof(double[]));
        TypeMapping.Add("string[]", typeof(string[]));
    }

    public async Task<object> VerifyClassAndMethod(dynamic input)
    {
        string className = (string) input.className;
        string methodName = (string) input.name;
        object[] inputTypes = (object[]) input.input;
        string outputType = (string) input.output;

        Type type = null;
        try
        {
            type = Type.GetType(className);
        }
        catch
        {
            return $"Error loading class {className}.";
        }
        if (type == null)
        {
            return $"The class {className} cannot be found.";
        }

        Type[] parameterTypes = new Type[inputTypes.Length];
        for (int i = 0; i < inputTypes.Length; i++)
        {
            if (!TypeMapping.ContainsKey((string) inputTypes[i]))
            {
                return $"The input type {inputTypes[i]} is not supported.";
            }
            parameterTypes[i] = TypeMapping[(string) inputTypes[i]];
        }
        MethodInfo method = null;
        try
        {
            method = type.GetMethod(methodName, BindingFlags.Public | BindingFlags.Instance, null, parameterTypes, null);
        }
        catch
        {
            return $"Error loading method {methodName}.";
        }
        if (method == null)
        {
            return $"The method {methodName} cannot be found.";
        }

        if (!TypeMapping.ContainsKey(outputType))
        {
            return $"The output type {outputType} is not supported.";
        }
        if (TypeMapping[outputType] != method.ReturnType)
        {
            return $"The output type {outputType} does not match.";
        }

        return null;
    }

    public async Task<object> CallMethod(dynamic input)
    {
        string className = (string) input.className;
        string methodName = (string) input.name;
        object[] inputTypes = (object[]) input.input;
        object[] inputValues = (object[]) input.value;

        Type type = Type.GetType(className);
        Type[] parameterTypes = new Type[inputTypes.Length];
        for (int i = 0; i < inputTypes.Length; i++)
        {
            parameterTypes[i] = TypeMapping[(string) inputTypes[i]];
        }
        MethodInfo method = type.GetMethod(methodName, BindingFlags.Public | BindingFlags.Instance, null, parameterTypes, null);

        Result result = new Result();

        object obj = Activator.CreateInstance(type);
        Stopwatch stopWatch = Stopwatch.StartNew();

        result.result = method.Invoke(obj, inputValues);

        stopWatch.Stop();
        result.executionTime += stopWatch.ElapsedMilliseconds;

        using (Process proc = Process.GetCurrentProcess())
        {
            result.memoryUsage = Math.Max(result.memoryUsage, (long) proc.PeakWorkingSet64);
        }

        return result;
    }

}

public class Result
{

    public object result
    {
        get;
        set;
    }

    public long executionTime
    {
        get;
        set;
    }

    public long memoryUsage
    {
        get;
        set;
    }

}
