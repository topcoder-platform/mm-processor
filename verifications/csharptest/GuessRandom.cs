using System;
using System.Threading;

public class GuessRandom
{

    private const int SIZE = 2 * 1024 * 1024;
    public int guess()
    {
        Random rand = new Random();
        return rand.Next(100);
    }

    public int testArrayOfInt(int[] array)
    {
        int temp = 0;
        for (int i = 0; i < array.Length; i++)
        {
            temp += array[i];
        }
        return temp;
    }

    public int testMemoryAndTime()
    {
        int[] i = new int[SIZE];
        Thread.Sleep(1000); // sleep one second
        return i.Length % 100;
    }

    public int testArrayOfString(string[] array)
    {
        return SIZE % 100;
    }

}
