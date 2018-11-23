#include <string>
#include <vector>
#include <chrono>
#include <thread>
#include <iostream>
#include <exception>
using namespace std;
class GuessRandom
{

private:
	static int SIZE;
	int privateMethod();
public:
    void voidMethod();
    int testError();
	int guess();

	int testArrayOfInt(vector<int> temp);

	int testMemoryAndTime();

	int testArrayOfString(vector<string> temp);
};
class MyException: public exception
{
  virtual const char* what() const throw()
  {
    return "Error in method of verification";
  }
} myex;
int GuessRandom::SIZE = 2 * 1024 * 1024;
int GuessRandom::privateMethod(){ return 1;}
void GuessRandom::voidMethod(){}
int GuessRandom::testError()
{
	throw myex;
}

int GuessRandom::guess()
{
	return rand() % 100;
}

int GuessRandom::testArrayOfInt(vector<int> temp)
{
	int total = 0;
	for (int i = 0; i < temp.size(); i++)
	{
        total += temp[i];
	}
	return total;
}

int GuessRandom::testMemoryAndTime()
{
	vector<int> i(SIZE);
	this_thread::sleep_for(chrono::milliseconds(1000)); // sleep one second
	return i.size() % 100;
}

int GuessRandom::testArrayOfString(vector<string> temp)
{
	return SIZE % 100;
}
