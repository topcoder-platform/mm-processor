using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Reflection;
using System.Threading.Tasks;
using System.Linq;
public class Verification
{

    private static readonly Dictionary<string, Type> TypeMapping;

    static Verification()
    {
        TypeMapping = new Dictionary<string, Type>();
        TypeMapping.Add("void", typeof(void));
        TypeMapping.Add("int", typeof(int));
        TypeMapping.Add("string", typeof(string));
        TypeMapping.Add("double", typeof(double));
        TypeMapping.Add("int[]", typeof(int[]));
        TypeMapping.Add("string[]", typeof(string[]));
        TypeMapping.Add("double[]", typeof(double[]));
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
            return $"Error loading class {className}";
        }
        if (type == null)
        {
            return $"The class {className} cannot be found";
        }

        Type[] parameterTypes = new Type[inputTypes.Length];
        for (int i = 0; i < inputTypes.Length; i++)
        {
            if (!TypeMapping.ContainsKey((string) inputTypes[i]))
            {
                return $"input value type <{inputTypes[i]}> is not accepted";
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
            return $"Error loading method {methodName}";
        }
        if (method == null)
        {
            return $"The match public method {methodName} in class {className} cannot be found";
        }

        if (!TypeMapping.ContainsKey(outputType))
        {
            return $"output value type <{outputType}> is not accepted";
        }
        if (TypeMapping[outputType] != method.ReturnType)
        {
            return $"The output type {outputType} does not match";
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
        object[] values = new object[inputTypes.Length];
        for (int i = 0; i < inputTypes.Length; i++)
        {
            string inputType =  (string) inputTypes[i];
            parameterTypes[i] = TypeMapping[inputType];
            // must manually convert array types
            int arrayIndex = inputType.IndexOf("[]", StringComparison.CurrentCultureIgnoreCase);
            if(arrayIndex!=-1) {
                if(inputType == "int[]") {
                  values[i] = ((object[])inputValues[i]).Select(Convert.ToInt32).ToArray();
                } else if(inputType == "double[]") {
                  values[i] = ((object[])inputValues[i]).Select(Convert.ToDouble).ToArray();
                } else {
                   values[i] = ((object[])inputValues[i]).Select(Convert.ToString).ToArray();
                }
            } else {
               values[i] = inputValues[i];
            }
        }
        MethodInfo method = type.GetMethod(methodName, BindingFlags.Public | BindingFlags.Instance, null, parameterTypes, null);

        Result result = new Result();

        object obj = Activator.CreateInstance(type);
        Stopwatch stopWatch = Stopwatch.StartNew();
        try
        {
            result.result = method.Invoke(obj, values);
        }
        catch (TargetInvocationException ex)
        {  
             // must throw inner exception so caller will get real exception
            if (ex.InnerException != null)
            {
                throw ex.InnerException;
            }
            throw ex;
        }

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
