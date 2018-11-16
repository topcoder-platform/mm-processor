import java.util.Map;
import java.util.HashMap;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.io.IOException;
public class Statistics extends <class-name> {
    private static final Map<String, Class<?>> SUPPORTED_TYPES = new HashMap<>();
    private long executeTime; // execute time
    private long memory; // max memory used in execute

    static {
       try {
           SUPPORTED_TYPES.put("void", Void.TYPE);
           SUPPORTED_TYPES.put("int", Integer.TYPE); // int
           SUPPORTED_TYPES.put("double", Double.TYPE); //double
           SUPPORTED_TYPES.put("string", String.class);// string
           SUPPORTED_TYPES.put("int[]", Class.forName("[I")); // int[]
           SUPPORTED_TYPES.put("double[]", Class.forName("[D")); // double[]
           SUPPORTED_TYPES.put("string[]", Class.forName("[Ljava.lang.String;")); // string[]
       } catch (Exception e) {
           // not happen
       }
     }

    public long getExecuteTime() {
        return executeTime;
    }

    public void setExecuteTime(long executeTime) {
        this.executeTime = executeTime;
    }

    public long getMemory() {
        return memory;
    }

    public void setMemory(long memory) {
        this.memory = memory;
    }

    /**
    * Find match public non static class method
    * @param className the class name.
    * @param methodName the method.name.
    * @param outputType the output type.
    * @param inputTypes the input types.
    * @throws RuntimeException throws if no match public non static class method found.
    */
   public static void findMethod(String className, String methodName, String outputType, String[] inputTypes) {
       try {
           Class<?> clazz = Class.forName(className);
           Method method;
           if (inputTypes == null || inputTypes.length == 0) {
               // public method without params.
               method = clazz.getMethod(methodName);

           } else {
               // public method with params.
               Class<?>[] parameterTypes = new Class<?>[inputTypes.length];
               if (!SUPPORTED_TYPES.containsKey(outputType)) {
                   throw new RuntimeException(String.format("output value type <%s> is not accepted", outputType));
               }
               for (int i = 0; i < inputTypes.length; i++) {
                   if (!SUPPORTED_TYPES.containsKey(inputTypes[i])) {
                       throw new RuntimeException(String.format("input value type <%s> is not accepted", inputTypes[i]));
                   }
                   parameterTypes[i] = SUPPORTED_TYPES.get(inputTypes[i]);
               }
               method = clazz.getMethod(methodName, parameterTypes);
           }
           if (SUPPORTED_TYPES.get(outputType) != method.getReturnType()) {
             throw new RuntimeException(String.format("The output type %s does not match", outputType));
            }
           if(Modifier.isStatic(method.getModifiers())){
              throw new RuntimeException(String.format("The public method %s in class %s is static", methodName, className));
           }
       } catch (ClassNotFoundException e) {
           throw new RuntimeException(String.format("The class %s cannot be found", className));
       } catch (NoSuchMethodException | SecurityException e) {
           throw new RuntimeException(String.format("The match public method %s in class %s cannot be found", methodName, className));
       }
   }
}
