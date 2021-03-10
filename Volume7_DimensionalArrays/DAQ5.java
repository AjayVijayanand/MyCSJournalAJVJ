package Volume7_DimensionalArrays;
import java.util.*;
public class DAQ5{
    public static void main(String[] args){
        Scanner input = new Scanner(System.in);
        int[] Num = new int[10];
        int[] EvenNum = new int[10];
        int[] OddNum = new int[10];
        int EvenSum = 0;
        int OddSum = 0;
        for(int x = 0; x <= 9; x++){
            System.out.print("Enter Number: ");
            Num[x] = input.nextInt();
            if (Num[x] % 2 != 0){
                EvenNum[x] = Num[x];
            } else {
                OddNum[x] = Num[x];
            }
        }
        for(int x = 0; x <= 9; x++){
            if (EvenNum[x] != 0){
                EvenSum = EvenSum + EvenNum[x];
            } else if(OddNum[x] != 0){
                OddSum = OddSum + OddNum[x];
            }
        }
        System.out.println("Your Array: " + Arrays.toString(Num));
        System.out.print("Even Sum: ");
        for(int x = 0; x <= 9; x++){
            if (EvenNum[x] != 0){
                System.out.print(Num[x] + " + ");
            } 
        }
        System.out.println("0 = " + EvenSum);
        System.out.print("Odd Sum: ");
        for(int x = 0; x <= 9; x++){
            if (OddNum[x] != 0){
                System.out.print(Num[x] + " + ");
            } 
        }
        System.out.println("0 = " + OddSum);
    }
}