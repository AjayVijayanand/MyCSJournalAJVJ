package Volume10_Recursionn2DArraysHL;
import java.util.Scanner;

public class R2AQ1 {
    static int Result = 1;
    public static int Factorial(int Num){
        if (Num == 0){
            return Result;
        } else {
            Result = Num * Factorial(Num - 1);
            return Result;
        }
    }
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);
        System.out.print("Enter Number: ");
        int x = input.nextInt();
        System.out.println(Factorial(x));
    }
}
