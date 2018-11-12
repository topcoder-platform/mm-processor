import java.util.Random;

public class GuessRandom {
  static final int SIZE = 2 * 1024 * 1024;

  public int guess() {
    Random r = new Random();
    return r.nextInt(100);
  }

  public int testArrayOfInt(int[] array) {
    int temp = 0;
    for (int i = 0; i < array.length; i++) {
      temp += array[i];
    }
    return temp;
  }

  public int testOOM() throws Exception {
    int[] i = new int[SIZE]; // if < 2 * 4M memory will throw java.lang.OutOfMemoryError
    Thread.sleep(1000); // sleep one second
    return i.length % 100;
  }

  public int testArrayOfString(String[] array) {
    return SIZE % 100;
  }
}
